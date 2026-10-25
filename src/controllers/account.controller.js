import accountModel from "../model/account.modal.js";

export const createAccountController = async (req, res) => {
    try {
        const user = req.user;
        const account = await accountModel.create({
            user: user._id
        });

        res.status(201).json({
            account
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

export const getUserAccountsController = async (req, res) => {
    try {
        const accounts = await accountModel.find({ user: req.user._id });

        res.status(200).json({
            accounts
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

export const getAccountBalanceController = async (req, res) => {
    try {
        const { accountId } = req.params;

        const account = await accountModel.findOne({
            _id: accountId,
            user: req.user._id
        });

        if (!account) {
            return res.status(404).json({
                message: "Account not found"
            });
        }

        const balance = await account.getBalance();

        res.status(200).json({
            accountId: account._id,
            balance: balance
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};