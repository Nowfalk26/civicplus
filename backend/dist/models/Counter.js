"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Counter = void 0;
exports.getNextAccountNumber = getNextAccountNumber;
exports.getNextEmployeeNumber = getNextEmployeeNumber;
const mongoose_1 = __importStar(require("mongoose"));
const CounterSchema = new mongoose_1.Schema({
    name: { type: String, required: true, unique: true },
    sequenceValue: { type: Number, default: 10000 },
});
exports.Counter = mongoose_1.default.models.Counter || mongoose_1.default.model('Counter', CounterSchema);
/**
 * Returns the next permanent formatted account sequence number, e.g. CP-10001
 */
async function getNextAccountNumber() {
    const counter = await exports.Counter.findOneAndUpdate({ name: 'userAccountNumber' }, { $inc: { sequenceValue: 1 } }, { returnDocument: 'after', upsert: true });
    return `CP-${counter.sequenceValue}`;
}
/**
 * Returns the next permanent formatted employee sequence number, e.g. EMP-TN-1001
 */
async function getNextEmployeeNumber() {
    const counter = await exports.Counter.findOneAndUpdate({ name: 'employeeNumber' }, { $inc: { sequenceValue: 1 } }, { returnDocument: 'after', upsert: true });
    return `EMP-TN-${counter.sequenceValue}`;
}
