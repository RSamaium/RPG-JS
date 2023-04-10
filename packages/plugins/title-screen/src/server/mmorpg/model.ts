import { Schema, model, models } from 'mongoose'
import bcryptPlugin from 'mongoose-bcrypt'

const schema = new Schema({ 
    nickname: { type: String, required: true, unique: true }, 
    password: { type: String, required: true },
    email: {
        type: String,
        required: true
    },
    date: { type: Date, default: Date.now },
    data: String
})

schema.plugin(bcryptPlugin)

export default models.Player || model('Player', schema);