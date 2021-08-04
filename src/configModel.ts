import { model, Schema } from "mongoose";

export interface IConfig extends Document {
	readonly guildId: string;
	readonly categories: string[][];
	readonly memberId: string;
	readonly roleManagerId: string;
	readonly lastReload: Date;
	readonly lastUpdate: Date;
}

export default model<IConfig>(
	"configs",
	new Schema({
		guildId: { type: String, index: true, required: true },
		categories: { type: [[String]] },
		memberId: { type: String, default: "" },
		roleManagerId: { type: String, default: "" },
		lastReload: { type: Date, default: new Date(Date.now()) },
		lastUpdate: { type: Date, default: new Date(Date.now()) },
	})
);
