const mongoose = require('mongoose');

const technicalquestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, "Question is required"],
    },
    intension: {
        type: String,
        required: [true, "Intension is required"],
    },
    answer: {
        type: String,
        required: [true, "Answer is required"],
    }, 
},{
    _id: false
});

const behaviourquestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, "Question is required"],
    },
    intension: {
        type: String,
        required: [true, "Intension is required"],
    },
    answer: {
        type: String,
        required: [true, "Answer is required"],
    }, 
},{
    _id: false
});

const skillgapschema = new mongoose.Schema({
    skill:{
        type: String,
        required: [true, "Skill is required"],
    },
    severity: {
        type: String,
        required: [true, "Severity is required"],
    },
},{
    _id: false
});

const preperationplanschema = new mongoose.Schema({
    day:{
        type:Number,
        required: [true, "Day is required"],
    },
    focus:{
        type: String,
        required: [true, "Focus is required"],
    },
    tasks:[{
        type: String,
        required: [true, "Task is required"],
    }]
},{
    _id: false
});

const interviewreportSchema = new mongoose.Schema({
     jobdescription: {
          type: String,
          required: [true, "Job description is required"],
     },
     resume:{
          type: String,
          required: [true, "Resume is required"],
     },
     selfdescription:{
          type: String,
          required: [true, "Self description is required"],
     },
     matchScore:{
          type: Number,
          min : 0,
          max : 100
     },
     technicalquestions: [technicalquestionSchema],
     behaviourquestions: [behaviourquestionSchema],
     skillgap: [skillgapschema],
     preperationplan: [preperationplanschema],
     user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: [true, "User is required"],
     },
     title: {
            type: String,
            required: [true, "Title is required"],
     }
        
},
        {
    timestamps: true});

const Interviewreport = mongoose.model('Interviewreport', interviewreportSchema);

module.exports = {Interviewreport};