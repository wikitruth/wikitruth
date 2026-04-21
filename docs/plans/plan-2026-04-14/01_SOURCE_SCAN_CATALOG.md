# Source Scan Catalog (One-by-One)

- Scope: `docs/ideas-docs/original` (90 files) + additional parse of `fixthephilippines.org/fixthephilippines.org` Word file with missing extension.
- Goal: identify implementable product ideas/features/plans and separate them from content-only/reference assets.

## Coverage Summary

- Original files reviewed: **90**
- Text-parsed documents: **40**
- Non-text/media assets (no reliable OCR): **50**

## File-by-File Log

### `About/Knowing and Discerning Truth.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - If the user does not agree with the above then the site won't make sense to him/her and there would be no point of proceeding.

### `About/Reader Warning.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals: none explicit; treated as context/reference.

### `About/What is Wikitruth.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - Why should I care / Why is it important?

### `Code/dependencies-01.png`
- Classification: Dependency diagram image
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: dependency diagrams; useful for implementation sequencing and coupling checks.

### `Code/dependencies-02.png`
- Classification: Dependency diagram image
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: dependency diagrams; useful for implementation sequencing and coupling checks.

### `Code/dependencies-03.png`
- Classification: Dependency diagram image
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: dependency diagrams; useful for implementation sequencing and coupling checks.

### `Code/dependencies-04.png`
- Classification: Dependency diagram image
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: dependency diagrams; useful for implementation sequencing and coupling checks.

### `Code/dependencies-05.png`
- Classification: Dependency diagram image
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: dependency diagrams; useful for implementation sequencing and coupling checks.

### `Design/Dictionary.smmx`
- Classification: Architecture/design diagram asset
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: dictionary model supports Word↔Meaning mapping (many-to-many).

### `Design/Entity Hierarchy.gliffy`
- Classification: Architecture/design diagram asset
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: entity flow includes Topic, Argument, Question, Answer, Issue, Comment.

### `Design/Linking.smmx`
- Classification: Architecture/design diagram asset
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: linking hierarchy across Country→Province→Org→Issue scope.

### `Design/Wikitruth.smmx`
- Classification: Architecture/design diagram asset
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: role model + core objects (Readers, Contributors, Peer Reviewers, Admins, Topic/Argument/Question/Answer/Tags).

### `Design/fixtheph.smmx`
- Classification: Architecture/design diagram asset
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: FixPH domain entities (Government, Departments, Groups, Projects, Incidents, Issues, Politicians).

### `Development Phases.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - * All entries should be unique
  - * Inline create/edit (refresh is ok)
  - + Get instant and direct facts: easily see the truth from difficult, big, or complex topics without the need to spend time to understand or perform re...

### `Feature List & Scenarios.xlsx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - | Feature | Expected |
  - | Reader | NaN |

### `Features & Mechanics/Acceptance & Verdict.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals: none explicit; treated as context/reference.

### `Features & Mechanics/Change Request (CR).docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - 1. Any number of contributors can submit a CR on a topic or argument which will be tagged to the current version of the item. Users can view pending a...
  - 3. Once a CR is accepted, the item’s version increases and other pending CRs will become outdated and others may become conflicting.
  - 3. If a CR is manually merged and the contributor find the merge incorrect or has affected the content, he can flag the merge as having an issue and o...

### `Features & Mechanics/Content Duplicates.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - * No single topic, argument, question can have duplicate.
  - * Any posting with similar gist should not be allowed or should be merged.

### `Features & Mechanics/Example topic content structure.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals: none explicit; treated as context/reference.

### `Features & Mechanics/Issues.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - * Issue Tags [Author/Reviewer]
  - Issue Types
  - * Terminology issue (word definition)

### `Features & Mechanics/Mechanics & Architecture (High-level).docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - Mechanics & Architecture (High-level)
  - Peer Reviewer Priorities: Top voted or those with most activities or user flagging, also by date will receive priority by peer reviewers.
  - 1. Provide authoritative, scrutiny-ready content that minimizes the need for trust from the contributors. Needing trust means content lacking sources/...

### `Features & Mechanics/Organize, Create References.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - **Organize, Create References**
  - * An author even not a reviewer can move / delete (?), create references of his entry as long as it’s not verified.

### `Features & Mechanics/Reader voice.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - **Reader voice** (in dropdown of argument by Readers)

### `Features & Mechanics/Reviewer Badges.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals: none explicit; treated as context/reference.

### `Features & Mechanics/Scenarios & Use Cases.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - * Reviewers will regularly create empty topics, arguments about the necessary and very important areas of knowledge, truth. These will aid in guiding ...
  - * Users can flag/vote on topics that requires attention or top priority.
  - **User Capabilities**

### `Features & Mechanics/Upvoting.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - * Helps in organizing content by gathering non-critical votes, user-consensus.
  - * The more support, arguments, verified comments in an item, the more peer review votes is needed to change it’s status

### `Features & Mechanics/Users.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - \* Reader/User - basic onboarding

### `Features & Mechanics/Versioning & History.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - **Versioning & History**
  - * Single-thread discussion history
  - * Issue of revision in the content, obsoletes the previous discussion (how to fix this?)

### `HE_poster_web_transparency.jpg`
- Classification: Uncategorized
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/368688363-James-Damore-vs-Google-Class-Action-Lawsuit.pdf`
- Classification: Reference material/content source
- Parse status: Text parsed
- Implementable signals:
  - review, and consistently received high performance ratings, placing him in the top few percentile of
  - The TGIF meeting on March 30, 2017 was entitled “Women’s History Month,” and
  - copy of the final version of the memo with all the edits incorporated is attached as “Exhibit A.”

### `Materials/ASUS ZenTalk 01.png`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/ASUS ZenTalk 02.png`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/Air China warns travelers to watch out for âIndians, Pakistanis and black peopleâ in London.pdf`
- Classification: Reference material/content source
- Parse status: Text parsed
- Implementable signals:
  - Air China execs must not have noticed the international uproar sparked by a Chinese detergent company‘s
  - racist ad earlier this year. In the September issue of its inﬂight magazine, the Chinese airline wholeheartedly
  - Wings of China is a bilingual publication. The Chinese-language version of the tip describes areas populated

### `Materials/Fact Opinion and Commonplace Assertion Notes.docx`
- Classification: Reference material/content source
- Parse status: Text parsed
- Implementable signals: none explicit; treated as context/reference.

### `Materials/FallaciesPoster24x36.pdf`
- Classification: Reference material/content source
- Parse status: Text parsed
- Implementable signals:
  - After Will said that we should put more money into health and education,
  - consequently happen too, therefore A should not happen.
  - The problem with this reasoning is that it avoids engaging with the issue at

### `Materials/How does creative thought differ from critical thought_ - Staff - Macquarie University.pdf`
- Classification: Reference material/content source
- Parse status: Text parsed
- Implementable signals:
  - range of definitions (for a review, see ALTC, 2009; Baker & Rudd, 2001; Forrester, 2008 & van
  - tries to create something new, critical thinking seeks to assess worth or validity in
  - process that contributes to creativity (alongside domain­relevant skills and task­motivation).

### `Materials/IMG_0461.PNG`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/IMG_0462.PNG`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/IMG_0463.PNG`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/IMG_0464.PNG`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/IMG_0465.PNG`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/IMG_0466.PNG`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/IMG_0467.PNG`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/IMG_0535.JPG`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/IMG_3995.JPG`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/IMG_4297.JPG`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/IMG_6175.PNG`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/IMG_9359.JPG`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/SSRN-id1354424.pdf`
- Classification: Reference material/content source
- Parse status: Text parsed
- Implementable signals:
  - The  data  show  that  Wiki-dispute  resolution  ignores  the  content  of  user  disputes,  instead  focusing  on  user
  - The History of Wikipedia’s Dispute Resolution System................................................................................. 8
  - Form: The Architecture of Today’s Wiki Dispute Resolution ....................................................................... 13

### `Materials/Screenshot 2018-09-10 17.40.31.png`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/The Baloney Detection Kit Carl Saganâs Rules for Bullshit-Busting and Critical Thinking â Brain Pickings.pdf`
- Classification: Reference material/content source
- Parse status: Text parsed
- Implementable signals:
  - reader, hopeless romantic,
  - but simply means that we need to equip ourselves
  - 1. Wherever possible there must be

### `Materials/The truth about US politics.docx`
- Classification: Reference material/content source
- Parse status: Text parsed
- Implementable signals:
  - 5) If you put all your faith in the Deep State apparatus that are the alphabet agencies then maybe you want to look at their history of overthrowing d...

### `Materials/book-2869.jpg`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/comment-review.PNG`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/comments.png`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/inline-answer-form.png`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/logo with padding narrow.png`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/logo with padding.png`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/logo-1024x1024.png`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/logo-alpha.png`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/logo.png`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/personal data.png`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/pin-web.png`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/protected personal data.png`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Materials/socially-derrived.PNG`
- Classification: Reference material/content source
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `Note to self & Considerations.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - **The system should be**
  - * Very user friendly
  - * Should not be frustrating otherwise people will not use it even how useful it is

### `Project Overview.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals: none explicit; treated as context/reference.

### `References & Related Materials.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - **Dynamic reference work**
  - * <https://www.quora.com/They-say-do-not-believe-what-you-see-they-also-say-do-not-believe-what-you-hear-So-what-should-we-believe>
  - * <http://www.goodreads.com/review/show/174132767>

### `Research Features.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - * How to create coherent chain or maintain the coherence, connection of argument hierarchy?
  - * Outline: featured entries will build an outline in the parent up to N-level of hierarchy. The order is Topics (child topics) then Arguments (top-dow...
  - * Should allow exaggeration and expressive sensible ideas (like illustrations and analogies)? Yes but in moderate amount, still use of common sense an...

### `Topics to create.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - Topics to create
  - * Add more content (Evolution, MSG, Climate Change, GMO)
  - * Build the top 3 topics to focus complete with supporting and contradicting arguments, questions, and issues in a well-structured format. (e.g. GMO, ...

### `UX/IMG_7250.PNG`
- Classification: UX mock/screenshot
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: UX layout references; require visual review pass for component-level tasks.

### `UX/wikitruth-ux.jpg`
- Classification: UX mock/screenshot
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: UX layout references; require visual review pass for component-level tasks.

### `Wikitruth Backlog.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - ## Backlog
  - 4. Let’s call a spade a spade. Most accurate description must be used unless discussing an idea and need a level of abstraction.
  - 5. Ambiguous and propagandist terms must be clarified and noted. Pro Choice must be described properly as a movement and if referring to the concept o...

### `Wikitruth Notes.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - + Any action that has negative impact to the argument but has no relevance to the core issue is unethical
  - * Extra care and skepticism should be exercise on the topic of History as a lot of details harder to verify and the chances of fraud easier to perform
  - * Should focus on important facts, not just any fact that may not be directly relevant to the controversial topic to optimize its operation and resour...

### `Wikitruth Tasks.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - 1. Admin backup should backup everything and can restore everything
  - 2. Fix grunt build issue
  - 3. Fix pm2 issue on later releases

### `fixthephilippines.org/FixthePH Notes.docx`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - Phase 1 MVP
  - * User contribution to existing content and merging of moderator (argument, topic, person, project, incident, org and branch)
  - Phase 2

### `fixthephilippines.org/IMG_9146.JPG`
- Classification: FixPH content seed/reference
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `fixthephilippines.org/IMG_9341.PNG`
- Classification: FixPH content seed/reference
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `fixthephilippines.org/IMG_9342.PNG`
- Classification: FixPH content seed/reference
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `fixthephilippines.org/Letter from Prime Minister Lee Hsien Loong to PAP MPs on Rules of Prudence _ Prime Ministerâs Office Singapore.pdf`
- Classification: FixPH content seed/reference
- Parse status: Text parsed
- Implementable signals:
  - are fundamental to our Party.  We must never tire of reminding ourselves of their importance.
  - Singapore forward beyond SG50.  Now we must fulfil what we have promised to do in our manifesto. We must never
  - break faith with the people, but must always carry out our duties to them responsibly, address their worries and advance

### `fixthephilippines.org/aquino-regime.JPG`
- Classification: FixPH content seed/reference
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `fixthephilippines.org/fixtheph-logo-red.psd`
- Classification: FixPH content seed/reference
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `fixthephilippines.org/fixtheph-logo.psd`
- Classification: FixPH content seed/reference
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `fixthephilippines.org/fixthephilippines.org`
- Classification: Product requirement/spec
- Parse status: Text parsed
- Implementable signals:
  - Nation-level issue tracking sections (Issues & Events, People, Groups, Projects)
  - Accountability model (budget/official/timeline/status per project)
  - Citizen uploads + concerns + suggestions workflows

### `fixthephilippines.org/gloria-complaints.docx`
- Classification: FixPH content seed/reference
- Parse status: Text parsed
- Implementable signals:
  - 7. Use of Road User's Tax for Campaigning
  - 45.- "Vote Buying" by giving away Philhealth cards

### `fixthephilippines.org/logo-1024x1024.png`
- Classification: FixPH content seed/reference
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `fixthephilippines.org/logo.jpg`
- Classification: FixPH content seed/reference
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `fixthephilippines.org/logo.png`
- Classification: FixPH content seed/reference
- Parse status: Binary/visual (manual interpretation only)
- Implementable signals: none machine-extracted (asset/reference only).

### `fixthephilippines.org/marcos.docx`
- Classification: FixPH content seed/reference
- Parse status: Text parsed
- Implementable signals: none explicit; treated as context/reference.

### `fixthephilippines.org/some-issues.docx`
- Classification: FixPH content seed/reference
- Parse status: Text parsed
- Implementable signals: none explicit; treated as context/reference.
