# The Wikitruth Project

[![Awesome Humane Tech](https://raw.githubusercontent.com/humanetech-community/awesome-humane-tech/main/humane-tech-badge.svg?sanitize=true)](https://github.com/humanetech-community/awesome-humane-tech)

The project aims to make a better world by finding the truth and facts of reality in all aspect of human knowledge, and present them in a way that is easy to search and understand by laypeople. It aims to do this by finding the truth using a systematic way of contribution and organization of arguments and evidences contrasted with reality and known facts.

An argument or a topic will be broken down into the smallest pieces necessary to rationally discuss and conclude its reliability and truthfulness. A set of contribution and discussion rules will be enforced by the system (automated) to prevent chaotic discussions, along with human critical thinking, moral intent and the collective effort of everyone wanting to find the truth.

This is an open research and an attempt to collect all verifiable facts and allow everyone to contribute, challenge the arguments with all sort of doubts and questions they can think of. Eventually, we can come up with a "golden source" of truth and facts of reality that survived all the challenges, hardened and supported by all available evidences and arguments.

This project does not intend to replace Wikipedia, Quora or other similar internet systems. It intends to provide a place for everyone who are looking for specific truth and facts of reality out of the ocean of information they see in the internet, from the news, search results, crowd-sourced sites, from people around them, and other various sources.

If someone wanted to find information about different topics or explore the vast information on the internet without the strong need for reliability and verifiability, there is Wikipedia, Quora and Google, but to see what is really the truth and reality, there is Wikitruth.

**Assumptions**
* A lot of people are having difficulty to find true information and difficulty to determine which one to believe.
* The world will be a better place if people will know the real truth, can easily find it, and distinguish from random claims and opinions.
* There is lots of information in the world, truth and lies lying around and intertwined together. People cannot easily differentiate between truth and lie because information is highly unorganized and a lot is unverifiable especially in the internet.
* If we can have a place where truth and lies are clearly organized, categories and distinctly separated, then people will easily see the truth and will know what is a lie.
* If people knows the truth, there will be less disagreements, less conflicts, better governance and politics, better education system, only one religion, better environment, better relationship between humans, better health, more love and there will be peace.

**General characteristics of discussions and internet forums for finding the truth**
* Mostly single-sided, controlled by users with admin privileges or by the majority
* Citing unverified or unverifiable sources
* Chaotic, unorganized or uncontrollable
* Ends with disagreements and often offensive and discriminatory in nature
* Cyclic (looping arguments), never-ending (check some Creationist vs Evolutionist discussions)
* Vital points get buried in comments
* Non-sense comments prevail due to number of upvotes
* Truth is hard to find

**Related Systems:**
* Quora
* Wikipedia
* Reddit
* StackExchange
* Yahoo! Answers
* Debate.org
* Citizendium

## Design Documents & Notes
[View on Google Drive](https://drive.google.com/folderview?id=0B_bsKNkSe3qYUzVEdDVrTkhYdzA&usp=sharing)

## Requirements

You need [Node.js](http://nodejs.org/download/) and [MongoDB](http://www.mongodb.org/downloads) installed and running. MongoDB version `~3.6` has been found to have [an issue](https://github.com/Automattic/mongoose/issues/5973) working with the npm module `mongoose`, so I would recommend using `~v3.4` which has been tested.

The project uses [ImageMagick](https://www.imagemagick.org) to manipulate image assets. The latest version (`v7.0.7-22` as of the time of writing) has been tested to work fine.

We use [`bcrypt`](https://github.com/ncb000gt/node.bcrypt.js) for hashing secrets. If you have issues during installation related to `bcrypt` then refer to [this wiki page](https://github.com/jedireza/drywall/wiki/bcrypt-Installation-Trouble).

We use [`emailjs`](https://github.com/eleith/emailjs) for email transport. If you have issues sending email refer to [this wiki page](https://github.com/jedireza/drywall/wiki/Trouble-sending-email).

## Setup

First, build the project.

```bash
$ git clone git@github.com:wikitruth/wikitruth.git && cd ./wikitruth
$ npm install
$ bower install
$ grunt build
```

Next, you need to edit your config file. Set your mongodb instance and SMTP email credentials to use for sending notification emails.

```bash
$ vi ./config.js # do the edit
```
<!-- $ npm install -g yo generator-kraken bower grunt-cli -->
<!--
## Setup

Next, you need a few records in the database to start using the user system.

Run these commands on mongo via the terminal. __Obviously you should use your
email address.__

```js
use wikitruth; // or your mongo db name if different
```

```js
db.admingroups.insert({ _id: 'root', name: 'Root' });
db.admins.insert({ name: {first: 'Root', last: 'Admin', full: 'Root Admin'}, groups: ['root'] });
var rootAdmin = db.admins.findOne();
db.users.save({ username: 'root', isActive: 'yes', email: 'your@email.addy', roles: {admin: rootAdmin._id} });
var rootUser = db.users.findOne();
rootAdmin.user = { id: rootUser._id, name: rootUser.username };
db.admins.save(rootAdmin);
```
-->

## Running the app

```bash
$ npm start

> wikitruth@0.5.0 start .../wikitruth
> grunt
> ...
Server listening on http://localhost:8000
```

Open your favourite browser and go to `http://localhost:8000`.

Since there is no existing data in your mongodb instance, you will be prompted with the `Install: MongoDB Restore` page to install the sample data that comes with the project.

Click the `Install` button and click `Continue` once the restore process is completed. Login with the following user credentials:
* Username: `root`
* Password: `dev123`

<!--
Now just use the reset password feature to set a password.

 - Go to `http://localhost:8000/login/forgot/`
 - Submit your email address and wait a second.
 - Go check your email and get the reset link.
 - `http://localhost:8000/login/reset/:email/:token/`
 - Set a new password.
-->

Explore the project and enjoy!

## Connect and discuss

Feel free to send feedback to wikitruth.project@gmail.com or start a discussion on [Facebook](https://www.facebook.com/wikitruth.project).
