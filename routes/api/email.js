const express = require('express');
const router = express.Router();
const sgMail = require('@sendgrid/mail');
const config = require('config');
const axios = require('axios');
const { check, validationResult } = require('express-validator');

const SENDGRID_API_KEY = config.get('SENDGRID_API_KEY');

const User = require('../../models/User');

// @route   POST api/email
// @desc    Register User
// @acess   Public
router.post(
  '/',
  [
    check('name', 'Name is requires').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, schedule } = req.body;

    let user = await User.findOne({ email, failed: false });
    if (user) {
      return res.status(400).json({ errors: [{ msg: 'User already exists' }] });
    }
    const unixTimestamp = Math.floor(new Date(schedule).getTime() / 1000);
    user = new User({
      name,
      email,
      schedule,
    });

    const isSave = await user.save();

    if (isSave) {
      sgMail.setApiKey(SENDGRID_API_KEY);
      const msg = {
        to: email,
        from: 'ravviverma963@gmail.com', // Use the email address or domain you verified above
        subject: 'Sending with Twilio SendGrid is Fun',
        text: 'and easy to do anywhere, even with Node.js',
        html: '<strong>and easy to do anywhere, even with Node.js</strong>',
        send_at: unixTimestamp,
      };

      await sgMail.send(msg);
      const response = await axios({
        method: 'post',
        url: 'https://api.sendgrid.com/v3/mail/batch',
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` },
      });
      const { batch_id } = response.data;
      if (batch_id) {
        console.log(isSave);
        await User.findByIdAndUpdate(isSave._id, { batch_id });
      }
    }

    res.send('Email Send Succesfully');
  }
);

// @route   POST api/email/read
// @desc    Read User Email
// @acess   Public
router.post(
  '/read',
  [check('email', 'Please include a valid email').isEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    const user = await User.findOne({ email });
    if (user) {
      return res.status(200).json(user);
    }

    return res.status(400).json({ errors: [{ msg: 'Email not exists' }] });
  }
);

// @route   GET api/email/list
// @desc    List of All Email
// @acess   Public
router.get('/list', async (req, res) => {
  const list = await User.find();
  if (list) {
    return res.status(200).json(list);
  }

  return res.status(400).json({ errors: [{ msg: 'No List yet' }] });
});

// @route   PUT api/email/update
// @desc    Re-schedule a mail
// @acess   Public
router.put(
  '/update',
  [check('email', 'Please include a valid email').isEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, schedule } = req.body;

    let user = await User.findOne({ email, failed: false });
    console.log('user', user);
    if (user) {
      await User.findOneAndUpdate({ email, failed: false }, { failed: true });

      const response = await axios({
        method: 'GET',
        url: `https://api.sendgrid.com/v3/mail/batch/${user.batch_id}`,
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` },
        body: {
          status: 'pause',
        },
      });
      console.log('resposne', response);
      if (response.status === 200) {
        await axios({
          method: 'POST',
          url: `https://api.sendgrid.com/v3/user/scheduled_sends`,
          headers: {
            Authorization: `Bearer ${SENDGRID_API_KEY}`,
            'on-behalf-of': 'jack1234',
          },
          body: {
            batch_id: user.batch_id,
            status: 'pause',
          },
        });
      }
    }
    const unixTimestamp = Math.floor(new Date(schedule).getTime() / 1000);
    user = new User({
      name: user.name,
      email,
      schedule,
    });

    const isSave = await user.save();

    if (isSave) {
      sgMail.setApiKey(SENDGRID_API_KEY);
      const msg = {
        to: email,
        from: 'ravviverma963@gmail.com', // Use the email address or domain you verified above
        subject: 'Sending with Twilio SendGrid is Fun',
        text: 'and easy to do anywhere, even with Node.js',
        html: '<strong>and easy to do anywhere, even with Node.js</strong>',
        send_at: unixTimestamp,
      };

      await sgMail.send(msg);
      const response = await axios({
        method: 'post',
        url: 'https://api.sendgrid.com/v3/mail/batch',
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` },
      });
      const { batch_id } = response.data;
      if (batch_id) {
        console.log(isSave);
        await User.findByIdAndUpdate(isSave._id, { batch_id });
      }
    }

    res.send('Email Send Succesfully');
  }
);

// @route   DELETE api/email/delete
// @desc    Delete a schedule mail
// @acess   Public
router.put(
  '/delete',
  [check('email', 'Please include a valid email').isEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      await User.findOneAndRemove({ email, failed: false });
      await axios({
        method: 'DELETE',
        url: `https://api.sendgrid.com/v3/user/scheduled_sends/${user.batch_id}`,
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` },
      });
    }
    res.send('Email Delete Succesfully');
  }
);

module.exports = router;
