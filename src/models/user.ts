import mongoose, { type InferSchemaType } from "mongoose";

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    idNumber: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export type User = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };

export const UserModel = mongoose.model("User", userSchema);

export async function findUserByPhone(phone: string): Promise<User | null> {
  return UserModel.findOne({ phone }).lean<User>().exec();
}

export async function saveUser(data: {
  phone: string;
  name: string;
  idNumber: string;
}): Promise<User> {
  const user = await UserModel.findOneAndUpdate(
    { phone: data.phone },
    { name: data.name, idNumber: data.idNumber },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
    .lean<User>()
    .exec();

  if (!user) {
    throw new Error("Failed to save user");
  }

  return user;
}
