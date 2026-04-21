**Current Sprint**

1. Admin backup should backup everything and can restore everything
2. Fix grunt build issue
3. Fix pm2 issue on later releases
4. Run the app in production mode in live
5. Delete topic bug - page does not navigate up
6. Empty title bug - can create an entry with empty title
7. Fast Switch with 6-digit PIN
   * A session flag to indicate if fully authorized, a fast switch is not, requires more authorization when doing privileged actions
   * UX
     1. Fast Switch option access anywhere = log off, show pin entry
     2. Interim: While doing a dirty solution in putting it in Login, show an icon to indicate that it’s enabled.
     3. Aggressive session expiry if used Fast Switch ~30mins idle/closed window
   * Login steps
     1. User enters pin
     2. Browser sends pin along with cookies (client\_ids)
     3. Nodejs server tries to decrypt cookies using secret (pin+server\_secret) one by one
     4. If successful, gets the client\_id then gets the user\_id
   * Task: handle cookie expiry
8. Diary move no refresh bug
9. Consider a new type — Opinion. Just like an opinion article or post.
10. Send copy/move entry to other users
11. Easily mark list items for copy/move
12. Topic tags: applies to topics and facts
    * filtering/tabs by tags
13. Fix markup for sharing on Facebook
14. Content presentation
    * Shortcut keys for quick view style switching
    * Instant rerender when view is changed
    * Like playing with a data dump and you can change the view as you like.
15. Bug fixes
    * Max preview of 2 lines for both desktop and mobile
    * Linked fact is not showing sub-facts
    * Backup entry field reorder
16. Entry details page background theme
17. Pinned diary topics
18. Support multiple types of layout
19. Dedicated move/copy/link screen (single)
20. Entry list options: Clipboard mark/copy/move
21. Expand/collapse feature in list view
22. User visit History list
23. Clipboard
    * Move and leave links
24. Continues expand of list
25. Start the bible module
26. Relationship
    * Child - a granular detail
    * Supporting
    * Against
    * Related
    * Link types: Child, Related entry, Source (Artifact), Reference/Supporting entry
27. Tag for negative/positive claims (display it too), tag for do not collapse content (automatic for artifacts?)
28. Inline create workflow
29. Convert entry type (e.g. Question to Fact, vice versa)
30. Collaborated topic
    * Can be public or private
    * Owner can set/add collaborators who will have write access
    * Can serve for debates
    * Can act like groups (for now)
31. Explore: Mixed items display in All tab
32. Home
    * Minitabs or sections: Latest, Trending, Top
    * Bottom actions: more (show more items), explore
33. Entry details
    * List items: show Top by default
    * Minitabs toggle on right: Top, Latest
    * Bottom actions: more (show more items), explore (open full list with advance filter)
34. See also section - view related or linked entries. Shown under In this section.
35. Link details: display target child entries, tags, and other properties
    * Verdict: how to display the verdict of a linked entry? Answer: For now, display as is? No. If something is true but linked to other topic incorrectly or flagged as against another fact even though not, then we can cannot just display the original verdict as is. So it should be source verdict + link verdict. Maybe display 2 verdicts?
36. Artifact & Source (Material)
    * Support this new type of entry
    * ~~Resides under a Topic.~~
    * Can have questions, issues, comments? Yes.
    * No sub-artifacts? Yes.
    * Artifacts Collection
    * Can have facts? Yes.
    * Can have child topics? No.
    * Format: text, image, video, file, data dump, sound, markup (Webpage)
    * Type: Quote, Photograph, Book, Lyrics, News Article, Social Media Post, Blog Post, Webpage, Speech/Talk, Movie, Documentary
    * An artifact has no length limit in content
    * Content type: External or inline/standalone (stored in the system)
37. Diary home
    * Latest edits/entries
    * Categories List
38. Sidebar: current topic - Parent Topics, Siblings, Children. Sidebar: display levels - current, parents and children. Better overall view.
39. Clipboard support for questions, answers, issues, and opinions
40. Links: topic and arguments links to questions, answers, issues, and opinions (many to many links)
41. Issue
    * By entry author: Mark as resolved
    * By issue filer: Verify and close or mark unresolved
    * By others: Reopen closed issue
42. Timeline view
43. Work on the MSM News Analyzer
44. Entry tags hierarchy
    * Primary: such as Main Topic, Category, With Value
    * Category: uses Topic entries to categorize ala labels
    * Attribution: topic types like Person, Country
    * Classification (Topic): Person, Country, etc
45. Dictionary
    * textbook or dictionary definition, technical definition, and others

**To elaborate the specs**

1. Link comments
2. Issue: Leftist strategy is instantly shaming/closing off the opposing viewpoint. Using ad hominem; misrepresentation; moving out of the topic; slurs; ad hominem
3. Allow anyone from contributors to use copy and paste.
4. New workflow: New from Nav - select type from menu > Select target topic > Display New page.
5. Extract critical features from all notes
6. Come up with rules to maintain easy to digest, compact, and concise topic size.
7. What starts a conversation? Something thought provoking.
8. Show top issues in entry details header
9. Thin line policy: a fact statement that is threading between true or false by a minor change in the statement or may easily confuse readers must be elaborated or must be rephrased.
10. Explore: All tab list - use 2 columns large screens
11. Visualize: fetching optimize by batching query
12. Private Group discussions
13. Theme per type of entry: e.g. https://english.stackexchange.com
14. Display more details in list for Arguments, Questions, Comments
15. Proper sharing rendering on FB
16. Use proper HTML semantics
17. Visualize
    * Quick toggle from visualize to explore from an entry view
    * Render linked entries
    * Diary link node from Explore
    * Wikitruth/root link node from Diary (up level)
    * Improve colors and node style
    * Show sub-arguments, questions
18. Home: My Diary section
19. Issue: Add support to issue - “contradicting”, “pot calling the kettle black”
20. My Diary: filters like in Explore
21. Update link entry display: display all related topics
22. Filter lists by tags
23. Types of reasoning: inductive, deductive, abductive; statistical, analogical, spatial, moral; abstract
24. No doxxing policy, witch hunting
25. Facts’ level of importance in relation to topic and for zooming: level 1, 2, 3
26. Tech debt: moving entries, should sync children
27. More compact UX, more context, better comprehension.
28. Context is everything for analysis and quick comprehension. Focus on enriching the context that is easy to absorb.
29. Move the gdrive docs to Wiki
30. Long content: “expand >” or “View full conversation”
31. Collapsible sidebar sections. State is remembered per user.
32. GroupThink, confirmation bias, cognitive dissonance
33. Photo Attachments
34. Diary Posts, Latest Members in Home
35. Fact clustering: Grouping of multiple child facts and creating a higher-level parent to represent them and summarize
36. Explore dropdown
    * All Categories
    * Visualize
    * \* Categories Listing \*
    * Latest Entries
    * Delay for now until we see how the sidebar will work
37. A section for Screeners in home: show summary of new pending items
38. A section for Reviewers in home: show summary of new unverified items. “No new reports and appeals.”
39. WT and FixPH: Focus on issues, controversies, and solutions. Especially on systemic or recurring issues or problems that need to be resolved. Build fixtheph structure by starting from major issues
40. Contribution: flow of content and locking mechanism
    * Pending screening > Screened > Reviewed/Verdict
    * When a content is screen or reviewed, it’s no longer own by the author but the system. Additional or edits changes will be considered suggestions and will go through the same process. The author may receive special rights to his contributions like speedy approval of edits.
    * Screening and approval can take multiple screener votes or verdict. The ⅔ or 66.66% votes will be followed especially if some votes to reject the content. In this case, ⅔ votes will take precedence.
41. Summary in Explore: Total approved, pending, rejected; by type of entry and link to display the items
42. Links
    * Support different types of link relationship like Jira links
    * Link description/subtitle: Bong to PDAF scam - “Involved / accused”.
43. Outline
    * Set the depth of outline, levels to display
    * Do not collapse outline, collapse only the content
44. Create more tags or tag editor: Tags per category (media: clickbait, fakenews, etc). Use topics as tags.
45. Related entries section (also in sidebar?)
46. Details tab changes (consider)
    * Moving options below the title. Will always be visible whichever tab is selected
    * Tabs ala TED website
47. List row Reply icon - show reply menu items for possible type of reply
48. Topic edit: More Properties - Icon, Timeline view tickbox, sort asc/desc
49. At the end of a list, add “Add new Fact, Question, Topic, Answer, etc”
50. Visualize
    * Selectable display up to 5th level, 25 items
    * Include Links with dotted lines
    * Use linkId as unique id
    * Legend below: double-click to navigate, etc
    * Exit icon - switches to Details
    * use clustering by zoom
51. Admin: Data summary - total count of records
52. Entry “…” or down arrow (More options): Report, Edit, Delete, Clipboard
53. Ethical Entry reactions: Good, bad, right, wrong, dangerous, peaceful, empathetic
54. List: Sort options - Title or Timeline, asc/desc
55. Util: Convert Topic to Fact and vice-versa
56. Topic for organizing only, display differently from a main topic
57. Larger margin on XL container
58. Create clear visual distinction between Artifact (source) and Fact
59. Timeline (toggle view)
    * My Lifespan marker: born and estimated death based on race, country, gender, lifestyle, diseases, or set a custom estimate of death
    * My illnesses and diseases (time occured/started)
    * My connections’(friends) lifespan
    * My life events and major happenings
    * My photos
    * Diary postings
    * My contributions
    * Public events in history and entries
60. My Map
    * My photos
    * My life events
    * Public events and entries
61. Type of Objects
    * Topic
      1. Topic: Various type of objects
      2. Listing Topic
      3. Link
    * Statements
      1. Fact (claim) - non-argument form, more of stating something plainly
      2. Fact (claim) - argument form, has clauses and conclusion: various types
      3. Ethical/moral statements
      4. Proposal for action (suggestion, advice, recommendation)
      5. Prediction of a future event, action, or activity
      6. Link
    * Artifact: various types
      1. Manuscript
      2. Book
      3. Statistical Data
      4. A research paper
    * Definition (word-meaning pair)
    * Issues: various types
    * Comments and Opinions
62. Comments subtitle: Comments and Opinions
63. Find a better font, improve typography
64. Facts subtitle: Statement of Facts, Claims, and Arguments
65. “Substance needed” instead of “citation needed”
66. Term: Counter Argument, Counter Fact, Claims, Thesis
67. Entry children: Properties to set sorting and display timeline view.
    * Entry: Settings in menu item for sorting type (sequence, title, date)
    * Sorting weight by many factors
    * Child entries sorting: By title, reference date, importance (verdicts)
    * Config to sort topic list via Ref Date, Asc or Desc (Timeline-style: vertical connecting line with dots)
68. Check color scheme of the FitBit Weekly Stats
69. View a list of linked entries
70. Editor: Allow grammar check underline errors in edit fields just like native controls.
71. + New menu entry
72. Use solid heart to indicate ethics/values
73. My Health: BMI Calculations
74. My Life: Date of birth and estimated death (can input manually)
75. Word-Definition pair
76. Allow entries to expand/collapse in list view in asyc manner (+/- clickable)
77. Use bootstrap tooltips to provide help text to elements
78. Allow Clipboard Move of any item including Links
79. Copy-Paste: Anyone can paste link but non-screeners will have pending links. Only owners can move their entry.
80. Rename Arguments to Statements. Allow filter by Facts, Ethics tags. Facts listing tags: Claim, Fact, Reviewed. Ethics listing tags: Ethics/heart, Good, Bad.
81. (?) Rename Arguments to Statements; Split New Arguments to New -- Argument on Truth, Argument on Value, Personal Experience, Artifact
82. Separate verdict for a topic entry and overall verdict including children.
83. Verdict, screening will have a linked commentId (opinion)
84. Ensure categoryId, ownerId. CategoryId to easily traverse entries.
85. Top entries in multi-level view ala reddit - topics, arguments, comments
86. Concept of Main topic - it will be the owner of all children. Also the basis of context to prevent repetitive title prefix/suffix.
87. Up/down arrows for Expose/Bury
88. Show expose/bury and good/bad in entry row footer or in “...” menu options
89. Easily filter multiple children for display ala Reddit. All arguments under a topic should have the same ownerId, questions and answers (?) under an entry, comments under an entry.
90. Fix login error when user has no password.
91. Clone Google Docs to Wikitruth Topic
92. Search and Member Contributions: filter by screening
93. Inline-style editing (make it look like the user never left the page)
94. Implement OpenGraph and more metatags, break down the implementation
95. Login via Facebook should support both Login and Registration
96. “New” button in the navbar: Topic, Statement, Question
97. Inline reply: set default type but allow to change by dropdown and link to full editor. Use POST to editor to retain content.
98. Wikitruth should support all efficient ways in presenting knowledge, facts, and memories.
99. Conclusive tag for use in verdict. Theoretical tag to use for seemingly correct but untested claims.
100. Argument tag: Simplification, Truistic, Particular/Specific Scope
101. Topic Link type: Source (internal source), Sub-Topic (?); A topic can be linked to an argument (as a source)
102. contextContent. Display in list view and content intro
103. argument.contextTitle
104. Focus on WHAT IS, less on WHAT IS NOT
105. Dictionary: should support a word/term that has multiple meanings and an idea that is referred by multiple words, a word-meaning pair. 1 to many and many to 1.
106. Handle sociological observations differently and claims based on ambiguous agreements: What is a real muslim (not clearly stated in Quran), a real scientist if there is no body or clear standard. We can base on consensus or popular claims.
107. People are compelled to engage if they stumble on a biased, controversial, or interesting material.
108. Major categories of content and difference to Wikipedia: Encyclopedic-style contents (includes controversial topics), reports of issues (ala fixtheph to surface issues) with supporting content (extrapolations from simple facts combined together to form conclusions), analysis of published content to point out the issues (artifacts, manuscripts), visualizations and interlinking of pieces, trying to come up with direct and concise conclusion for large and complicated topics which causes issues in the society
109. Use the terms Pros and Cons
110. Duplicate Finder: useful when screening content
111. Add email BCC to alerts
112. Types of topics

* Events, News (Moon landing)
* Phenomenons (gravity, laws of nature)
* People, People Groups, objects

**Decisions and Questions**

* Actions in home: New Topic, Argument, Debate, Question then show intuitive picker or to placement method of the new content.
* How to make Home and reply intuitive?
* Category Tags: the option to create logical categorization, for example, the ability to create categories in a list of arguments under a topic.
* Why does it feels like just thinking of what argument to create is difficult? What is the ideal flow of composing arguments? Start with a question?
* Consider using Google AMP
* Topic vs Argument are still confusing. How to create a clear distinction between the two?
* How to maintain coherence from argument to sub-argument
* How to provide a thread like reply > reply feel if arguments are stated in neutral/standalone/generic format
* Topic List: How to render this and what sort of behavior to support?

**Modules**

* My Health
  + Saves your stats and gives you your weight for every BMI classification
  + Condition Finder: Select symptoms and find out the possible disease
* MSM News Analyzer
  + Setup an MSM for scraping by providing the parameters
  + Scrape all news posts from a date range
  + Display the most prevalent and widely used words across all the posts
  + Display a timeline of usage when a word is selected
  + Group similar words

**High-level Goals and Features**

* Optimize site for reading
* Optimize site for contribution
* Optimize site for dialectics
* Hierarchical comment thread-like for arguments
* More compact entries
* Efficiently support rich way of presenting information e.g. images, videos, graphs, figures
* At a glance: get the overall idea of a topic in 5 seconds
* Sub-entries of an entry must look as much direct or connected as possible to the parent to help in feel of coherence
* Allow a comment thread-like UI (continues flow)

**Security**

* Protect user identity (email, IP, name, etc)
  + Do not backup any user-related information
* Ensure users can re-gain access when public data is restored as is
* Fact: Public data can be tampered when a user restores to own server
* Allow complete anonymity i.e. no public information including IP
