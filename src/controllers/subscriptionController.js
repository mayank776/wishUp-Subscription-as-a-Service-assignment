const { userModel, subscriptionModel, planModel } = require("../models");

const moment = require("moment");

const validator = require("../utils/validator.js");

const subsPlan = require("../configs/subsPlan.js");

const createSubscription = async (req, res) => {
  try {
    const requestBody = req.body;

    // checking for valid input
    if (!validator.isValidRequestBody(requestBody)) {
      res.status(400).send({
        status: "FAILURE",
        msg: "enter a valid body",
      });
      return;
    }

    // object destructuring
    let { plan_id, user_name, start_date } = requestBody;

    // username should be present as well
    if (!validator.isValid(user_name)) {
      res.status(400).send({
        status: "FAILURE",
        msg: "enter a user name",
      });
      return;
    }

    // whether the user has registered

    const user = await userModel.findOne({
      user_name,
    });

    if (!user) {
      res.status(404).send({
        status: "FAILURE",
        msg: `user ${user_name} not registered`,
      });
      return;
    }

    user_name = user._id;

    // valid plan Id
    if (!validator.isValid(plan_id)) {
      res.status(400).send({
        status: "FAILURE",
        msg: "enter a plan id",
      });
      return;
    }

    // plan id can only be one of the given six
    if (!validator.isValidPlan(plan_id)) {
      res.status(400).send({
        status: "FAILURE",
        msg: `the plan should be one of ${subsPlan.plan_Id.join(", ")} `,
      });
      return;
    }

    // start_date should be entered
    if (!validator.isValid(start_date)) {
      res.status(400).send({
        status: "FAILURE",
        message: "enter a date and in YYYY-MM-DD format",
      });
      return;
    }

    // valid date should be enterd
    if (!validator.validDate(start_date)) {
      res.status(400).send({
        status: "FAILURE",
        message: "enter a correct date and in YYYY-MM-DD format",
      });
      return;
    }

    // whether the start_date is not from past
    if (!validator.isToday(start_date)) {
      return res.status(400).send({
        status: "FAILURE",
        msg: "please enter a present date",
      });
    }

    // checking whether the user has already subscribed

    let total_subscriptions = await subscriptionModel.find({
      user_name: user_name,
      $sort: { valid_till: 1 },
    });

    // taking out the last active subscription
    if (total_subscriptions.length >= 1) {
      var latestSubscription =
        total_subscriptions[total_subscriptions.length - 1];
      let validTill = latestSubscription.valid_till;

      // if only the person is not on free plan otherwise we would want him to subscribe asap..
      if (!(latestSubscription.plan_id == "FREE")) {
        // if the input start_date is before the expiration of last subscription then,
        if (
          moment(start_date).format("YYYY-MM-DD") <
          moment(validTill).format("YYYY-MM-DD")
        ) {
          // we will make the next day from expiration as start_date
          start_date = moment(validTill, "YYYY-MM-DD").add(1, "days");
        }
      }
    }

    // calculating valid_till date
    const plan = await planModel.findOne({
      plan_id,
    });

    var valid_till;

    // for FREE plan and INFINITE validity i've taken an infinite number
    if (plan.validity == 1e300) {
      // for infinite date
      var MAX_TIMESTAMP = 8640000000000000;
      valid_till = new Date(MAX_TIMESTAMP);
    } else {
      valid_till = moment(start_date, "YYYY-MM-DD").add(plan.validity, "days");
    }

    // creating new subscription
    const newSub = {
      plan_id,
      user_name,
      start_date,
      valid_till,
    };

    const subscription = await subscriptionModel.create(newSub);

    // cost of chosen subscription plan
    const amount = plan.cost;

    if (!subscription) {
      return res.status(400).send({
        status: "FAILURE",
        msg: "Subscription Failed. Your money will be sent back",
        amount: +amount,
      });
    }

    // output

    res.status(201).send({
      status: "SUCCESS",
      amount: -amount,
    });
  } catch (error) {
    res.status(500).send({
      status: "FAILURE",
      msg: error.message,
    });
  }
};

const getSubscriptionByDate = async (req, res) => {
  try {
    let user_name = req.params.user_name;
    let input_date = req.params.date;

    // validating all the inputs
    if (!validator.isValid(user_name)) {
      res.status(400).send({
        status: "FAILURE",
        msg: "enter a valid name",
      });
      return;
    }

    if (!validator.isValid(input_date)) {
      res.status(400).send({
        status: "FAILURE",
        message: "date is required",
      });
      return;
    }

    if (!validator.validDate(input_date)) {
      res.status(400).send({
        status: "FAILURE",
        message: "enter date in YYYY-MM-DD format",
      });
      return;
    }

    // check whether the input date is not from the past
    if (!validator.isToday(input_date)) {
      return res.status(400).send({
        status: "FAILURE",
        msg: "please enter today's date",
      });
    }

    // checking whether the user is present or not
    const user = await userModel.findOne({
      user_name,
    });

    if (!user) {
      res.status(404).send({
        status: "FAILURE",
        msg: `user ${user_name} not found`,
      });
      return;
    }

    // casting username to objectId
    user_name = user._id;

    // checking whether he has subscribed or not
    const subscription = await subscriptionModel.findOne({
      user_name: user_name,
      start_date: { $lte: new Date(input_date) },
      valid_till: { $gte: new Date(input_date) },
      plan_id: { $ne: "FREE" },
    });

    // if subscription is not found
    if (!subscription) {
      res.status(404).send({
        status: "FAILURE",
        msg: `user ${user_name} has not subscribed to any of the plan yet`,
      });
      return;
    }

    // using moment to get the days left
    const plan_id = subscription.plan_id;
    const valid_till = moment(subscription.valid_till);
    input_date = moment(input_date);

    const days_left = valid_till.diff(input_date, "days");

    const data = {
      plan_id,
      days_left,
    };

    // output
    res.status(200).send({
      status: "SUCCESS",
      data: data,
    });
  } catch (error) {
    res.status(500).send({
      status: "FAILURE",
      msg: error.message,
    });
  }
};

const getSubscription = async (req, res) => {
  try {
    let user_name = req.params.user_name;

    // validating input
    if (!validator.isValid(user_name)) {
      res.status(400).send({
        status: "FAILURE",
        msg: "enter a valid name",
      });
      return;
    }

    // finding the user in db
    const user = await userModel.findOne({
      user_name,
    });

    if (!user) {
      res.status(404).send({
        status: "FAILURE",
        msg: `user ${user_name} not found`,
      });
      return;
    }

    // casting username to objectId
    user_name = user._id;

    // finding all the subs of user
    const subs = await subscriptionModel.find(
      {
        user_name: user_name,
      },
      {
        user_name: 0,
        _id: 0,
        __v: 0,
      }
    );

    if (subs == 0) {
      res.status(404).send({
        status: "FAILURE",
        msg: `user ${user_name} has not subscribed yet`,
      });
      return;
    }

    res.status(200).send({
      status: "SUCCESS",
      data: subs,
    });
  } catch (error) {
    res.status(500).send({
      status: "FAILURE",
      msg: error.message,
    });
  }
};

module.exports = {
  createSubscription,
  getSubscriptionByDate,
  getSubscription,
};
