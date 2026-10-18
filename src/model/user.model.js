
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must contain at least 2 characters'],
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },

        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must contain at least 8 characters'],
            select: false,
        },

        systemUser: {
            type: Boolean,
            default: false,
            immutable: true,
            select: false,
        },
        isVerified: {
            type: Boolean,
            default: false
        },
    },
    {
        timestamps: true,
    }
);

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
