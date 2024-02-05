import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    accounts: [
        {
            access_token: { type: String, required: true },
            refresh_token: { type: String, required: true },
            scope: { type: String },
            token_type: { type: String },
            expiry_date: { type: Number },
        }
    ],
    events: [
        {
            startDateTime: { type: Date, required: true },
            endDateTime: { type: Date, required: true },
            summary: { type: String, required: true },
            eventId: { type: String, required: true },
        }
    ],
}, {timestamps: true});
const User = mongoose.model('User',userSchema);
export default User;