package com.cpen321.movietier.data.local

/**
 * Movie quotes database organized by category.
 * Extracted from MovieQuoteProvider to reduce class size.
 */
internal object MovieQuotesData {

    fun populateQuotes(addQuote: (String, String) -> Unit) {
        populateClassicsAndAwards(addQuote)
        populateStarWars(addQuote)
        populateLOTRAndFantasy(addQuote)
        populateHarryPotter(addQuote)
        populateClassicAction(addQuote)
        populateMarvelDC(addQuote)
        populatePixarAndGhibli(addQuote)
        populateFastFurious(addQuote)
        populateDisneyClassics(addQuote)
        populateDreamWorks(addQuote)
        populateRomComs(addQuote)
        populateHorror(addQuote)
        populateSciFi(addQuote)
        populateDrama(addQuote)
    }

    private fun populateClassicsAndAwards(addQuote: (String, String) -> Unit) {
        addQuote("The Shawshank Redemption", "Get busy living.")
        addQuote("The Godfather", "I'm making them an offer.")
        addQuote("The Godfather Part II", "Keep your friends close.")
        addQuote("The Dark Knight", "Why so serious?")
        addQuote("Inception", "Dream a little bigger.")
        addQuote("Interstellar", "Stay. Just stay.")
        addQuote("Parasite", "Plan harder.")
        addQuote("Pulp Fiction", "Say what again.")
        addQuote("Forrest Gump", "Life is a box of chocolates.")
        addQuote("The Matrix", "There is no spoon.")
        addQuote("The Prestige", "Are you watching closely?")
        addQuote("Se7en", "What's in the box?")
        addQuote("Gladiator", "Are you not entertained?")
        addQuote("The Departed", "I'm doing my job.")
        addQuote("Whiplash", "Not quite my tempo.")
        addQuote("The Social Network", "A million dollars isn't cool.")
        addQuote("La La Land", "Here's to the fools.")
        addQuote("Mad Max: Fury Road", "Witness me.")
        addQuote("The Grand Budapest Hotel", "Hands off my lobby boy.")
        addQuote("Her", "We are only here briefly.")
        addQuote("Moonlight", "You good, Chiron?")
        addQuote("Dune", "Fear is the mind-killer.")
        addQuote("Everything Everywhere All at Once", "Be kind when you can.")
        addQuote("Spider-Man: Into the Spider-Verse", "Anyone can wear the mask.")
        addQuote("Blade Runner 2049", "All the best memories are hers.")
        addQuote("Arrival", "Language is the first weapon.")
        addQuote("Joker", "You get what you deserve.")
        addQuote("Oppenheimer", "Prometheus stole fire.")
    }


    private fun populateDisneyClassics(addQuote: (String, String) -> Unit) {
        val quotes = listOf("Color your world.", "Dream in motion.", "Animated delight.", "Drawn to adventure.", "Play it again.")
        val movies = listOf(
            "Snow White and the Seven Dwarfs", "Pinocchio", "Fantasia", "Dumbo", "Bambi",
            "Cinderella", "Alice in Wonderland", "Peter Pan", "Lady and the Tramp", "Sleeping Beauty",
            "One Hundred and One Dalmatians", "The Jungle Book", "The Aristocats", "Robin Hood",
            "The Many Adventures of Winnie the Pooh", "The Fox and the Hound", "The Little Mermaid",
            "Beauty and the Beast", "Aladdin", "Pocahontas", "The Hunchback of Notre Dame",
            "Hercules", "Mulan", "Tarzan", "Lilo & Stitch", "Treasure Planet", "Brother Bear",
            "Home on the Range", "Chicken Little", "Meet the Robinsons", "Bolt",
            "The Princess and the Frog", "Tangled", "Wreck-It Ralph", "Frozen", "Big Hero 6",
            "Zootopia", "Moana", "Ralph Breaks the Internet", "Frozen II", "Raya and the Last Dragon",
            "Strange World", "Wish"
        )
        movies.forEachIndexed { index, movie -> addQuote(movie, quotes[index % quotes.size]) }
    }

    private fun populateDreamWorksMovies(addQuote: (String, String) -> Unit) {
        val quotes = listOf("Play it again.", "Color your world.", "Dream in motion.", "Animated delight.", "Drawn to adventure.")
        val movies = listOf(
            "Shrek", "Shrek 2", "Shrek the Third", "Shrek Forever After", "Puss in Boots",
            "Puss in Boots: The Last Wish", "Madagascar", "Madagascar: Escape 2 Africa",
            "Madagascar 3: Europe's Most Wanted", "Penguins of Madagascar", "Kung Fu Panda",
            "Kung Fu Panda 2", "Kung Fu Panda 3", "Kung Fu Panda 4", "How to Train Your Dragon",
            "How to Train Your Dragon 2", "How to Train Your Dragon: The Hidden World",
            "The Croods", "The Croods: A New Age", "Megamind", "Trolls", "Trolls World Tour",
            "Trolls Band Together", "Rise of the Guardians", "The Prince of Egypt",
            "Spirit: Stallion of the Cimarron", "Over the Hedge", "Monsters vs Aliens",
            "Bee Movie", "Turbo", "Captain Underpants: The First Epic Movie", "Boss Baby",
            "The Bad Guys"
        )
        movies.forEachIndexed { index, movie -> addQuote(movie, quotes[index % quotes.size]) }
    }

    private fun populateRomanticComedies(addQuote: (String, String) -> Unit) {
        val quotes = listOf("Love takes flight.", "Hearts collide.", "Say yes.", "Love finds a way.", "Hold me close.")
        val movies = listOf(
            "Notting Hill", "Love Actually", "Four Weddings and a Funeral", "About Time",
            "Bridget Jones's Diary", "Bridget Jones: The Edge of Reason", "Bridget Jones's Baby",
            "Crazy, Stupid, Love", "The Proposal", "Sleepless in Seattle", "You've Got Mail",
            "While You Were Sleeping", "Runaway Bride", "Pretty Woman", "My Best Friend's Wedding",
            "The Princess Diaries", "The Princess Diaries 2: Royal Engagement", "Enchanted",
            "Disenchanted", "Sweet Home Alabama", "Hitch", "27 Dresses", "Legally Blonde",
            "Legally Blonde 2", "How to Lose a Guy in 10 Days", "Two Weeks Notice", "The Holiday",
            "Music and Lyrics", "Failure to Launch", "Just Friends", "Definitely, Maybe",
            "Crazy Rich Asians", "To All the Boys I've Loved Before", "Always Be My Maybe",
            "Set It Up", "13 Going on 30", "The Lake House", "Jerry Maguire", "Kate & Leopold",
            "The Big Sick", "Silver Linings Playbook", "Friends with Benefits", "No Strings Attached",
            "The Duff", "The Spectacular Now", "Warm Bodies", "Palm Springs", "The Incredible Jessica James"
        )
        movies.forEachIndexed { index, movie -> addQuote(movie, quotes[index % quotes.size]) }
    }

    private fun populateActionFranchises(addQuote: (String, String) -> Unit) {
        val actionQuotes = listOf("Adventure awaits.", "Pack the bags.", "Trailblaze now.", "Map the unknown.", "Never stop exploring.")
        val missionImpossible = listOf(
            "Mission: Impossible", "Mission: Impossible 2", "Mission: Impossible III",
            "Mission: Impossible - Ghost Protocol", "Mission: Impossible - Rogue Nation",
            "Mission: Impossible - Fallout", "Mission: Impossible - Dead Reckoning"
        )
        val johnWick = listOf("John Wick", "John Wick: Chapter 2", "John Wick: Chapter 3", "John Wick: Chapter 4")
        val dieHard = listOf("Die Hard 2", "Die Hard with a Vengeance", "Live Free or Die Hard", "A Good Day to Die Hard")
        val lethalWeapon = listOf("Lethal Weapon", "Lethal Weapon 2", "Lethal Weapon 3", "Lethal Weapon 4")
        val badBoys = listOf("Bad Boys", "Bad Boys II", "Bad Boys for Life")
        val madMax = listOf("Mad Max", "Mad Max 2", "Mad Max Beyond Thunderdome")
        val terminator = listOf("Terminator", "Terminator 3", "Terminator Salvation", "Terminator Genisys", "Terminator: Dark Fate")
        val roboCop = listOf("RoboCop", "RoboCop 2", "RoboCop 3")
        val equalizer = listOf("The Equalizer", "The Equalizer 2", "The Equalizer 3")
        val taken = listOf("Taken", "Taken 2", "Taken 3")
        val bourne = listOf("The Bourne Identity", "The Bourne Supremacy", "The Bourne Ultimatum", "The Bourne Legacy", "Jason Bourne")
        val jackReacher = listOf("Jack Reacher", "Jack Reacher: Never Go Back")
        val topGun = listOf("Top Gun", "Top Gun: Maverick")

        (missionImpossible + johnWick + dieHard + lethalWeapon + badBoys + madMax +
         terminator + roboCop + equalizer + taken + bourne + jackReacher + topGun +
         listOf("Edge of Tomorrow", "Minority Report", "Collateral", "True Lies"))
            .forEachIndexed { index, movie -> addQuote(movie, actionQuotes[index % actionQuotes.size]) }

        // Fast & Furious franchise
        val ffQuotes = listOf("Family first.", "Home is here.", "Together strong.", "Cherish the moment.", "We stick together.")
        val fastFurious = listOf(
            "The Fast and the Furious", "2 Fast 2 Furious", "The Fast and the Furious: Tokyo Drift",
            "Fast & Furious", "Fast Five", "Fast & Furious 6", "Furious 7",
            "The Fate of the Furious", "Fast & Furious Presents: Hobbs & Shaw", "F9", "Fast X"
        )
        fastFurious.forEachIndexed { index, movie -> addQuote(movie, ffQuotes[index % ffQuotes.size]) }
    }

    private fun populateSportsMovies(addQuote: (String, String) -> Unit) {
        val quotes = listOf("Go for gold.", "All heart.", "Leave it all.", "Game on.", "Chase the win.")
        val movies = listOf(
            "Rocky II", "Rocky III", "Rocky IV", "Rocky V", "Rocky Balboa", "Creed", "Creed II", "Creed III",
            "Raging Bull", "Million Dollar Baby", "Cinderella Man", "Warrior", "The Fighter",
            "Remember the Titans", "Coach Carter", "Hoosiers", "White Men Can't Jump", "He Got Game",
            "Space Jam", "Space Jam: A New Legacy", "The Sandlot", "A League of Their Own",
            "Bend It Like Beckham", "Cool Runnings", "Blades of Glory", "I, Tonya", "Ford v Ferrari",
            "Rush", "Days of Thunder", "Seabiscuit", "We Are Marshall", "Invictus",
            "Chariots of Fire", "Breaking Away", "Field of Dreams", "Bull Durham", "Draft Day",
            "Moneyball", "The Blind Side", "Glory Road", "The Mighty Ducks", "D2: The Mighty Ducks",
            "D3: The Mighty Ducks", "Miracle", "Happy Gilmore", "The Waterboy"
        )
        movies.forEachIndexed { index, movie -> addQuote(movie, quotes[index % quotes.size]) }
    }

    private fun populateHorrorMovies(addQuote: (String, String) -> Unit) {
        val quotes = listOf("Lights stay on.", "Fear the shadows.", "Don't look back.", "Hide and seek.", "Stay quiet.")
        val halloween = (1..11).map { if (it == 1) "Halloween" else if (it <= 6) "Halloween ${"II III IV V VI".split(" ")[it-2]}" else when(it) {
            7 -> "Halloween: The Curse of Michael Myers"
            8 -> "Halloween H20"
            9 -> "Halloween: Resurrection"
            10 -> "Halloween (2018)"
            else -> if (it == 11) "Halloween Kills" else "Halloween Ends"
        }}
        val friday13 = (1..11).map { if (it == 1) "Friday the 13th" else if (it <= 8) "Friday the 13th Part ${if (it == 2) "2" else if (it == 3) "III" else if (it == 4) ": The Final Chapter" else if (it == 5) ": A New Beginning" else if (it == 6) "Part VI" else if (it == 7) "Part VII" else "Part VIII"}" else if (it == 9) "Jason Goes to Hell" else if (it == 10) "Jason X" else "Freddy vs. Jason" }
        val nightmare = listOf("A Nightmare on Elm Street", "A Nightmare on Elm Street 2", "A Nightmare on Elm Street 3",
            "A Nightmare on Elm Street 4", "A Nightmare on Elm Street 5", "Freddy's Dead: The Final Nightmare", "Wes Craven's New Nightmare")
        val scream = listOf("Scream", "Scream 2", "Scream 3", "Scream 4", "Scream (2022)", "Scream VI")
        val conjuring = listOf("The Conjuring", "The Conjuring 2", "The Conjuring: The Devil Made Me Do It",
            "Annabelle", "Annabelle: Creation", "Annabelle Comes Home", "The Nun", "The Nun II")
        val insidious = listOf("Insidious", "Insidious: Chapter 2", "Insidious: Chapter 3", "Insidious: The Last Key", "Insidious: The Red Door")
        val paranormal = listOf("Paranormal Activity", "Paranormal Activity 2", "Paranormal Activity 3",
            "Paranormal Activity 4", "The Marked Ones", "The Ghost Dimension")
        val saw = listOf("Saw", "Saw II", "Saw III", "Saw IV", "Saw V", "Saw VI", "Saw VII", "Jigsaw", "Spiral")
        val evilDead = listOf("Evil Dead", "Evil Dead II", "Army of Darkness", "Evil Dead (2013)", "Evil Dead Rise")
        val other = listOf("A Quiet Place", "A Quiet Place Part II", "Don't Breathe", "Lights Out", "The Babadook",
            "Hereditary", "Midsommar", "It", "It Chapter Two", "The Ring", "The Grudge", "Sinister",
            "The Black Phone", "Us", "Nope", "Coraline", "ParaNorman", "Monster House")

        (halloween + friday13 + nightmare + scream + conjuring + insidious + paranormal + saw + evilDead + other)
            .forEachIndexed { index, movie -> addQuote(movie, quotes[index % quotes.size]) }
    }

    private fun populateMysteryMovies(addQuote: (String, String) -> Unit) {
        val quotes = listOf("Follow the clues.", "Keep guessing.", "Secrets unravel.", "Case cracked.", "Mind the mystery.")
        val movies = listOf(
            "Knives Out", "Glass Onion", "Murder on the Orient Express", "Death on the Nile", "See How They Run",
            "Sherlock Holmes", "Sherlock Holmes: A Game of Shadows", "Enola Holmes", "Enola Holmes 2", "Clue",
            "The Nice Guys", "Chinatown", "L.A. Confidential", "Zodiac", "Gone Girl", "Prisoners",
            "The Girl with the Dragon Tattoo", "The Girl Who Played with Fire", "The Girl Who Kicked the Hornet's Nest",
            "Mystic River", "Shutter Island", "Memento", "Insomnia", "Tenet", "Oldboy", "Mother",
            "Memories of Murder", "The Handmaiden", "Decision to Leave"
        )
        movies.forEachIndexed { index, movie -> addQuote(movie, quotes[index % quotes.size]) }
    }

    private fun populateDramaMovies(addQuote: (String, String) -> Unit) {
        val quotes = listOf("Feel everything.", "Emotions run deep.", "Hold on tight.", "Hearts on sleeve.", "Truth cuts deep.")
        val movies = listOf(
            "The Green Mile", "Saving Private Ryan", "Schindler's List", "Munich", "Lincoln",
            "Bridge of Spies", "Catch Me If You Can", "The Post", "Philadelphia", "A Beautiful Mind",
            "The Imitation Game", "The King's Speech", "Darkest Hour", "The Theory of Everything",
            "The Pianist", "Life is Beautiful", "Amélie", "The Intouchables", "Jojo Rabbit",
            "Little Women", "Lady Bird", "Brooklyn", "Three Billboards Outside Ebbing, Missouri",
            "Fargo", "No Country for Old Men", "There Will Be Blood", "The Master", "Punch-Drunk Love",
            "Magnolia", "Boogie Nights", "First Man", "Manchester by the Sea", "If Beale Street Could Talk",
            "Selma", "Hidden Figures", "The Help", "The Color Purple", "Green Book", "12 Years a Slave",
            "Glory", "Malcolm X", "Fruitvale Station"
        )
        movies.forEachIndexed { index, movie -> addQuote(movie, quotes[index % quotes.size]) }
    }

    private fun populateWarMovies(addQuote: (String, String) -> Unit) {
        val quotes = listOf("Hold the line.", "Stand together.", "Bravery holds.", "Never retreat.", "Brothers in arms.")
        val movies = listOf(
            "1917", "Dunkirk", "Hacksaw Ridge", "Fury", "Zero Dark Thirty", "Black Hawk Down",
            "The Hurt Locker", "Lone Survivor", "American Sniper", "Jarhead", "Enemy at the Gates",
            "Letters from Iwo Jima", "Flags of Our Fathers", "Platoon", "Apocalypse Now",
            "Full Metal Jacket", "Born on the Fourth of July", "The Thin Red Line", "We Were Soldiers",
            "Pearl Harbor", "Midway", "Patton", "Band of Brothers", "The Pacific", "Master and Commander",
            "The Last Samurai", "Defiance", "A Bridge Too Far", "The Guns of Navarone", "Where Eagles Dare",
            "The Great Escape", "Das Boot", "All Quiet on the Western Front", "Paths of Glory",
            "Lawrence of Arabia", "Zulu", "The Longest Day", "Gallipoli", "Tora! Tora! Tora!",
            "The Dirty Dozen", "Kelly's Heroes"
        )
        movies.forEachIndexed { index, movie -> addQuote(movie, quotes[index % quotes.size]) }
    }

    private fun populateKoreanCinema(addQuote: (String, String) -> Unit) {
        val quotes = listOf("Feel everything.", "Emotions run deep.", "Hold on tight.", "Hearts on sleeve.", "Truth cuts deep.")
        val movies = listOf(
            "Seven Samurai", "Yojimbo", "Ran", "Throne of Blood", "Ikiru", "Rashomon", "High and Low", "Tokyo Story",
            "Battle Royale", "Train to Busan", "The Host", "Okja", "A Taxi Driver", "Burning", "The Wailing",
            "I Saw the Devil", "Sympathy for Mr. Vengeance", "Lady Vengeance", "Snowpiercer", "Secret Sunshine",
            "Peppermint Candy", "Joint Security Area", "Silenced", "Masquerade", "The Man from Nowhere",
            "The Good, the Bad, the Weird", "Assassination", "The Age of Shadows", "The Thieves",
            "Train to Busan Presents: Peninsula", "Miracle in Cell No. 7", "Space Sweepers", "Swing Kids",
            "Extreme Job", "Midnight Runners", "Exit", "1987: When the Day Comes",
            "Along with the Gods: The Two Worlds", "Along with the Gods: The Last 49 Days",
            "The Battleship Island", "Forgotten", "A Bittersweet Life", "Memories of the Sword",
            "War of the Arrows", "The Sword with No Name", "The Divine Move", "The Outlaws",
            "Project Wolf Hunting", "Steel Rain", "Steel Rain 2", "Ashfall", "Monstrum", "Rampant",
            "The Princess", "The Roundup", "The Roundup: No Way Out", "Hansan: Rising Dragon",
            "The Admiral: Roaring Currents", "The Negotiation", "A Company Man", "The Suspect",
            "Veteran", "Ode to My Father", "A Hard Day", "The Berlin File", "The Villainess",
            "The Spy Gone North", "Confidential Assignment", "Confidential Assignment 2", "Fabricated City", "The Drug King"
        )
        movies.forEachIndexed { index, movie -> addQuote(movie, quotes[index % quotes.size]) }
    }

    private fun populateMusicalMovies(addQuote: (String, String) -> Unit) {
        val quotes = listOf("Adventure awaits.", "Pack the bags.", "Trailblaze now.", "Map the unknown.", "Never stop exploring.")
        val movies = listOf(
            "A Star Is Born", "The Greatest Showman", "Les Misérables", "Moulin Rouge!", "Chicago", "Dreamgirls",
            "West Side Story", "In the Heights", "Rent", "Sing Street", "Once", "Begin Again", "August Rush",
            "Pitch Perfect", "Pitch Perfect 2", "Pitch Perfect 3", "School of Rock", "Almost Famous",
            "Bohemian Rhapsody", "Rocketman", "Love & Mercy", "Yesterday", "Across the Universe",
            "Cadillac Records", "Ray", "Walk the Line", "Crazy Heart", "Inside Llewyn Davis", "Selena"
        )
        movies.forEachIndexed { index, movie -> addQuote(movie, quotes[index % quotes.size]) }
    }

    private fun populateYoungAdultMovies(addQuote: (String, String) -> Unit) {
        val quotes = listOf("Adventure awaits.", "Pack the bags.", "Trailblaze now.", "Map the unknown.", "Never stop exploring.")
        val movies = listOf(
            "Hotel Transylvania", "Hotel Transylvania 2", "Hotel Transylvania 3", "Hotel Transylvania 4",
            "Casper", "Hocus Pocus", "Hocus Pocus 2", "Practical Magic", "The Craft", "The Covenant",
            "Twilight", "New Moon", "Eclipse", "Breaking Dawn Part 1", "Breaking Dawn Part 2",
            "The Hunger Games", "Catching Fire", "Mockingjay Part 1", "Mockingjay Part 2",
            "Divergent", "Insurgent", "Allegiant", "The Maze Runner", "The Scorch Trials", "The Death Cure",
            "TRON", "TRON: Legacy", "The Last Starfighter", "The Giver", "The Darkest Minds", "I Am Number Four",
            "Percy Jackson & the Olympians", "Percy Jackson: Sea of Monsters", "The Seeker", "Inkheart",
            "City of Ember", "The Spiderwick Chronicles", "The Mortal Instruments", "Beautiful Creatures",
            "The Fifth Wave", "Push", "Jumper", "Project Power", "Code 8", "Bright"
        )
        movies.forEachIndexed { index, movie -> addQuote(movie, quotes[index % quotes.size]) }
    }

    private fun populateFamilyMovies(addQuote: (String, String) -> Unit) {
        val quotes = listOf("Family first.", "Home is here.", "Together strong.", "Cherish the moment.", "We stick together.")
        val movies = listOf(
            "Home Alone", "Home Alone 2", "Home Alone 3", "Home Alone 4", "Home Alone 5",
            "Honey, I Shrunk the Kids", "Honey, I Blew Up the Kid", "Honey, We Shrunk Ourselves",
            "Matilda", "The Parent Trap", "The Parent Trap (1961)", "Father of the Bride", "Father of the Bride Part II",
            "Cheaper by the Dozen", "Cheaper by the Dozen 2", "The Sound of Music", "Mary Poppins", "Mary Poppins Returns",
            "Bedknobs and Broomsticks", "Chitty Chitty Bang Bang", "Charlie and the Chocolate Factory",
            "Willy Wonka & the Chocolate Factory", "Hook", "Jumanji", "Jumanji: Welcome to the Jungle",
            "Jumanji: The Next Level", "Night at the Museum", "Night at the Museum: Battle of the Smithsonian",
            "Night at the Museum: Secret of the Tomb", "The Santa Clause", "The Santa Clause 2", "The Santa Clause 3",
            "Elf", "The Polar Express", "Paddington", "Paddington 2", "Peter Rabbit", "Peter Rabbit 2",
            "Stuart Little", "Stuart Little 2", "Babe", "Babe: Pig in the City", "Free Willy", "Free Willy 2", "Free Willy 3"
        )
        movies.forEachIndexed { index, movie -> addQuote(movie, quotes[index % quotes.size]) }
    }

    private fun populateUpcomingMovies(addQuote: (String, String) -> Unit) {
        val quotes = listOf("Adventure awaits.", "Pack the bags.", "Trailblaze now.", "Map the unknown.", "Never stop exploring.", "Color your world.", "Dream in motion.", "Animated delight.", "Drawn to adventure.", "Play it again.")
        val movies = listOf(
            // Animated Sequels
            "Moana 2", "Zootopia 2", "Inside Out 3", "Toy Story 5", "Cars 4", "Finding Nemo 3", "Coco 2",
            "Encanto 2", "Turning Red 2", "Luca 2", "Elemental 2", "Soul 2", "The Incredibles 3", "Monsters Inc 3",
            "Brave 2", "WALL-E 2", "Ratatouille 2", "Onward 2", "Lightyear 2", "A Bug's Life 2",
            "Shrek 5", "Puss in Boots 3", "Madagascar 4", "The Croods 3", "How to Train Your Dragon 4",
            "Kung Fu Panda 5", "Boss Baby 3", "Trolls 4", "The Bad Guys 2", "Megamind 2", "Rise of the Guardians 2",
            // Live Action Sequels
            "The Equalizer 4", "The Bourne Resurrection", "Taken 4", "Jack Reacher 3", "John Wick 5",
            "Mission: Impossible 8", "Top Gun 3", "Edge of Tomorrow 2", "Mad Max: Furiosa", "District 10",
            "World War Z 2", "I Am Legend 2", "Gladiator II", "Constantine 2", "The Accountant 2",
            "The Nice Guys 2", "Enola Holmes 3", "Knives Out 3", "Crazy Rich Asians 2", "The Old Guard 2",
            "Extraction 2", "Extraction 3", "The Gray Man 2", "Red Notice 2", "Red Notice 3", "The Gentlemen 2",
            "Sherlock Holmes 3", "Avatar 3", "Avatar 4", "Avatar 5", "Tron 3",
            "The Batman Part II", "The Batman Part III", "Joker: Folie à Deux", "Wonder Woman 3", "Man of Steel 2",
            "Justice League 2", "Shazam 3", "Black Adam 2", "Aquaman 3"
        )
        movies.forEachIndexed { index, movie -> addQuote(movie, quotes[index % quotes.size]) }
    }
}

    private fun populateStarWars(addQuote: (String, String) -> Unit) {
        val quote = "Space calls."
        listOf("The Empire Strikes Back", "Star Wars", "Return of the Jedi", "The Phantom Menace", 
            "Attack of the Clones", "Revenge of the Sith", "The Force Awakens", "The Last Jedi",
            "The Rise of Skywalker", "Rogue One", "Solo").forEach { addQuote(it, quote) }
    }

    private fun populateLOTRAndFantasy(addQuote: (String, String) -> Unit) {
        val quote = "Adventure awaits."
        listOf("The Lord of the Rings", "The Hobbit", "The Fellowship of the Ring", 
            "The Two Towers", "The Return of the King").forEach { addQuote(it, quote) }
    }

    private fun populateHarryPotter(addQuote: (String, String) -> Unit) {
        val quote = "Magic is real."
        listOf("Harry Potter and the Sorcerer's Stone", "Harry Potter and the Chamber of Secrets",
            "Harry Potter and the Prisoner of Azkaban", "Harry Potter and the Goblet of Fire",
            "Harry Potter and the Order of the Phoenix", "Harry Potter and the Half-Blood Prince",
            "Harry Potter and the Deathly Hallows").forEach { addQuote(it, quote) }
    }

    private fun populateClassicAction(addQuote: (String, String) -> Unit) {
        val quote = "Action packed."
        listOf("Die Hard", "Terminator", "The Bourne Identity", "Mission: Impossible",
            "John Wick", "Top Gun").forEach { addQuote(it, quote) }
    }

    private fun populateMarvelDC(addQuote: (String, String) -> Unit) {
        val quote = "Heroes rise."
        listOf("The Avengers", "Iron Man", "Captain America", "Thor", "Black Panther",
            "Spider-Man", "Batman", "Superman", "Wonder Woman").forEach { addQuote(it, quote) }
    }

    private fun populatePixarAndGhibli(addQuote: (String, String) -> Unit) {
        val quote = "Animated wonder."
        listOf("Toy Story", "Finding Nemo", "The Incredibles", "Up", "Inside Out",
            "Spirited Away", "My Neighbor Totoro", "Princess Mononoke").forEach { addQuote(it, quote) }
    }

    private fun populateFastFurious(addQuote: (String, String) -> Unit) {
        val quote = "Family first."
        listOf("The Fast and the Furious", "2 Fast 2 Furious", "Fast & Furious",
            "Fast Five", "Furious 7").forEach { addQuote(it, quote) }
    }

    private fun populateDreamWorks(addQuote: (String, String) -> Unit) {
        val quote = "Dream big."
        listOf("Shrek", "Madagascar", "Kung Fu Panda", "How to Train Your Dragon").forEach { addQuote(it, quote) }
    }

    private fun populateRomComs(addQuote: (String, String) -> Unit) {
        val quote = "Love wins."
        listOf("When Harry Met Sally", "Notting Hill", "The Proposal", "Crazy Rich Asians").forEach { addQuote(it, quote) }
    }

    private fun populateHorror(addQuote: (String, String) -> Unit) {
        val quote = "Fear awaits."
        listOf("The Shining", "Get Out", "A Quiet Place", "The Conjuring").forEach { addQuote(it, quote) }
    }

    private fun populateSciFi(addQuote: (String, String) -> Unit) {
        val quote = "Future calls."
        listOf("Blade Runner", "2001: A Space Odyssey", "Ex Machina", "The Martian").forEach { addQuote(it, quote) }
    }

    private fun populateDrama(addQuote: (String, String) -> Unit) {
        val quote = "Stories matter."
        listOf("The Shawshank Redemption", "Schindler's List", "12 Years a Slave").forEach { addQuote(it, quote) }
    }
