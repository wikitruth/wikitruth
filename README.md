# wikitruth

The project aims to make a better world by finding the truth in all aspect of knowledge and collect, present them in a way that is easy to search and understand by laypeople. It aims to do this by finding the truth using a genuine intent, sound judgement, critical thinking, a set of system mechanics that prevent chaotic discussions, and the collective effort of everyone wanting to find the truth.

This is an open research and an attempt to collect all verifiable facts and open them to everyone to contribute, challenge and come up with all sorts of doubts they can think of. Eventually, we can come up with a "golden source" which is a collection of truth that survived all the arguments from anyone, hardened by the challenges and supported by all available evidences.

This project does not intend to replace Wikipedia or other crowd-sourced encyclopedia or similar internet sites. It intends to provide a place for everyone who are looking for a specific truth out of the various information they see in the internet, from the news, from people around them, and from various sources.

If someone wanted to find information about different topics or explore the vast information from the internet, there is Wikipedia and Google, but to see what is really the truth, then this is where they can go.

**General Assumptions**
* A lot of people are having difficulty to find true information and difficulty to determine which one to believe.
* The world will be a better place if people will know the real truth, can easily find it, and distinguish from random claims and opinions.
* There is lots of information in the world, truth and lies lying around and intertwined together. People cannot easily differentiate between truth and lie because information is highly unorganized and a lot is unverifiable especially in the internet.
* If we can have a place where truth and lies are clearly organized, categories and distinctly separated, then people will easily see the truth and will know what is a lie.
* If people knows the truth, there will be less disagreements, less conflicts, better governance and politics, better education system, only one religion, better environment, better relationship between humans, better health, more love and there will be peace.

**General Characteristics of most Discussions and Internet Forums**
* Mostly single-sided, controlled by users with admin privileges or by the majority
* Citing unverified or unverifiable sources
* Chaotic, unorganized or uncontrollable
* Ends with disagreements and often offensive and discriminatory in nature
* Cyclic, looping arguments, never-ending (check some Creationist vs Evolutionist discussions)
* Vital points get buried in comments
* Non-sense comments often prevail due to numbers
* Truth is hard to find

**Related Systems:**
* Yahoo! Answers
* Quora
* Answers.com
* GotQuestions.org
* Wikipedia
* Citizendium
* Conservapedia.com
* StackExchange
* Debate.org
* rationalwiki.org


## Requirements

You need [Node.js](http://nodejs.org/download/) and
[MongoDB](http://www.mongodb.org/downloads) installed and running.

We use [`bcrypt`](https://github.com/ncb000gt/node.bcrypt.js) for hashing
secrets. If you have issues during installation related to `bcrypt` then [refer
to this wiki
page](https://github.com/jedireza/drywall/wiki/bcrypt-Installation-Trouble).

We use [`emailjs`](https://github.com/eleith/emailjs) for email transport. If
you have issues sending email [refer to this wiki
page](https://github.com/jedireza/drywall/wiki/Trouble-sending-email).


## Installation

Install nodejs

```bash
$ git clone git@github.com:dsalunga/wikitruth.git && cd ./wikitruth
$ npm install -g yo generator-kraken bower grunt-cli
$ npm install
```


## Running the app

```bash
$ npm start

# > wikitruth@0.0.0 start .../wikitruth
# > grunt
# Running "copy:vendor" (copy) task
# ...
# Running "concurrent:dev" (concurrent) task
# Running "watch" task
# Running "nodemon:dev" (nodemon) task
# Waiting...
# [nodemon] v1.3.7
# [nodemon] to restart at any time, enter `rs`
# [nodemon] watching: *.*
# [nodemon] starting `node app.js`
# Server is running on port 8000
```

Now just use the reset password feature to set a password.

 - Go to `http://localhost:8000/login/forgot/`
 - Submit your email address and wait a second.
 - Go check your email and get the reset link.
 - `http://localhost:8000/login/reset/:email/:token/`
 - Set a new password.

Login. Customize. Enjoy.
