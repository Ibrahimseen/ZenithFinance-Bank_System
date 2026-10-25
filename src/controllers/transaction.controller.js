import transactionModel from "../model/transaction.model.js"
import ledgerModel from "../model/ledger.model.js"
import accountModel from "../model/account.modal.js"
import { sendTransactionEmail } from "../services/emailsender.js"
import mongoose from "mongoose"



export const createTransaction = async (req, res) => {
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "FromAccount, toAccount, amount and idempotencyKey are required"
        });
    }

    let session;

    try {
        const fromUserAccount = await accountModel.findOne({
            _id: fromAccount
        });

        const toUserAccount = await accountModel.findOne({
            _id: toAccount
        });

        if (!fromUserAccount || !toUserAccount) {
            return res.status(400).json({
                message: "Invalid fromAccount or toAccount"
            });
        }

        const isTransactionAlreadyExists = await transactionModel.findOne({
            idempotencyKey
        });

        if (isTransactionAlreadyExists) {
            if (isTransactionAlreadyExists.status === "COMPLETED") {
                return res.status(200).json({
                    message: "Transaction already processed",
                    transaction: isTransactionAlreadyExists
                });
            }

            if (isTransactionAlreadyExists.status === "PENDING") {
                return res.status(200).json({
                    message: "Transaction is still processing",
                    transaction: isTransactionAlreadyExists
                });
            }

            if (
                isTransactionAlreadyExists.status === "FAILED" ||
                isTransactionAlreadyExists.status === "REVERSED"
            ) {
                return res.status(400).json({
                    message: `Transaction status is ${isTransactionAlreadyExists.status}`,
                    transaction: isTransactionAlreadyExists
                });
            }
        }

        if (
            fromUserAccount.status !== "ACTIVE" ||
            toUserAccount.status !== "ACTIVE"
        ) {
            return res.status(400).json({
                message: "Both fromAccount and toAccount must be ACTIVE to process transaction"
            });
        }

        const balance = await fromUserAccount.getBalance();

        if (balance < amount) {
            return res.status(400).json({
                message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`
            });
        }

        session = await mongoose.startSession();
        session.startTransaction();

        const [newTransaction] = await transactionModel.create([{
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        }], { session });

        await ledgerModel.create([{
            account: fromAccount,
            amount,
            transaction: newTransaction._id,
            type: "DEBIT"
        }], { session });

        await new Promise((resolve) => setTimeout(resolve, 15 * 1000));

        await ledgerModel.create([{
            account: toAccount,
            amount,
            transaction: newTransaction._id,
            type: "CREDIT"
        }], { session });

        newTransaction.status = "COMPLETED";
        await newTransaction.save({ session });

        await session.commitTransaction();

        await sendTransactionEmail(
            req.user.email,
            req.user.name,
            amount,
            toAccount
        );

        return res.status(201).json({
            message: "Transaction completed successfully",
            transaction: newTransaction
        });

    } catch (error) {
        if (session?.inTransaction()) {
            await session.abortTransaction();
        }

        console.error("Transaction Error:", error);

        return res.status(500).json({
            message: "Transaction processing failed",
            error: error.message
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};


export const createInitialFundsTransaction = async (req, res) => {
    const { toAccount, amount, idempotencyKey } = req.body

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount, amount and idempotencyKey are required"
        })
    }

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })

    if (!toUserAccount) {
        return res.status(400).json({
            message: "Invalid toAccount"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        user: req.user._id
    })

    if (!fromUserAccount) {
        return res.status(400).json({
            message: "System user account not found"
        })
    }

    const session = await mongoose.startSession()
    session.startTransaction()

    const transaction = new transactionModel({
        fromAccount: fromUserAccount._id,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING"
    })

    const debitLedgerEntry = await ledgerModel.create([{
        account: fromUserAccount._id,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT"
    }], { session })

    const creditLedgerEntry = await ledgerModel.create([{
        account: toAccount,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT"
    }], { session })

    transaction.status = "COMPLETED"
    await transaction.save({ session })

    await session.commitTransaction()
    session.endSession()

    return res.status(201).json({
        message: "Initial funds transaction completed successfully",
        transaction: transaction
    })
}
