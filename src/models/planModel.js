const mongoose = require("mongoose");

const subsPlan = require("../configs/subsPlan.js");

const planSchema = new mongoose.Schema({
    plan_id: {
        type: String,
        required: true,
        enum: subsPlan.plan_Id,
        trim: true
    },
    validity: {
        type: Number,
        // validity is stored in days
        required: true,
        trim: true
    },
    cost: {
        type: Number,
        required: true,
        trim: true
    },
});

module.exports = mongoose.model("plan", planSchema);