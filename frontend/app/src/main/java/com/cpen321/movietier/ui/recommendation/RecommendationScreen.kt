package com.cpen321.movietier.ui.recommendation

import androidx.compose.animation.Crossfade
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.res.painterResource
import androidx.compose.foundation.Image
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import coil.compose.AsyncImage
import com.cpen321.movietier.R
import androidx.compose.foundation.layout.WindowInsets
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.cpen321.movietier.data.model.Movie
import com.cpen321.movietier.ui.components.*
import com.cpen321.movietier.ui.components.YouTubePlayerDialog
import com.cpen321.movietier.ui.viewmodels.RecommendationViewModel
import com.cpen321.movietier.ui.viewmodels.RankingViewModel
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.launch
import android.content.Intent
import android.net.Uri
import com.cpen321.movietier.utils.LocationHelper
import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import com.cpen321.movietier.data.local.MovieQuoteProvider
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecommendationScreen(
    navController: NavController,
    recommendationViewModel: RecommendationViewModel = hiltViewModel(),
    rankingViewModel: RankingViewModel = hiltViewModel()
) {
    val uiState by recommendationViewModel.uiState.collectAsState()
    val compareState by rankingViewModel.compareState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    var selectedMovie by remember { mutableStateOf<Movie?>(null) }
    var trailerKey by remember { mutableStateOf<String?>(null) }
    var showTrailerDialog by remember { mutableStateOf(false) }
    var trailerMovieTitle by remember { mutableStateOf("") }
    var featuredMovieOffset by remember { mutableStateOf(0) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var country by remember { mutableStateOf("CA") }

    // Request location permission and get country code
    val locationPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true ||
            permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true) {
            scope.launch {
                country = LocationHelper.getCountryCode(context)
            }
        }
    }

    LaunchedEffect(Unit) {
        if (LocationHelper.hasLocationPermission(context)) {
            country = LocationHelper.getCountryCode(context)
        } else {
            locationPermissionLauncher.launch(LocationHelper.getLocationPermissions())
        }
    }

    LaunchedEffect(Unit) {
        recommendationViewModel.events.collect { event ->
            when (event) {
                is com.cpen321.movietier.ui.viewmodels.FeedEvent.Message -> {
                    println("Snack: ${event.text}") // for debugging
                    snackbarHostState.showSnackbar(event.text)
                }
                is com.cpen321.movietier.ui.viewmodels.FeedEvent.Error -> {
                    // Close bottom sheet if open and show error
                    selectedMovie = null
                    snackbarHostState.showSnackbar(event.text)
                }
            }
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Image(
                            painter = painterResource(id = R.drawable.in_app_icon),
                            contentDescription = "MovieTier",
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("MovieTier", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }
                },
                actions = {
                    IconButton(onClick = { recommendationViewModel.loadRecommendations() }) {
                        Icon(imageVector = Icons.Default.Refresh, contentDescription = "Refresh recommendations")
                    }
                },
                windowInsets = WindowInsets(0, 0, 0, 0)
            )
        }
    ) { padding ->

        Crossfade(
            targetState = when {
                uiState.isLoading -> RecommendationState.LOADING
                uiState.errorMessage != null -> RecommendationState.ERROR
                uiState.recommendations.isEmpty() -> RecommendationState.EMPTY
                else -> RecommendationState.CONTENT
            },
            label = "recommendation_state"
        ) { state ->
            when (state) {
                RecommendationState.LOADING -> {
                    LoadingState(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding),
                        hint = "Finding recommendations..."
                    )
                }

                RecommendationState.ERROR -> {
                    ErrorState(
                        message = uiState.errorMessage ?: "Failed to load recommendations",
                        onRetry = { recommendationViewModel.loadRecommendations() },
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                    )
                }

                RecommendationState.EMPTY -> {
                    EmptyState(
                        icon = Icons.Default.Favorite,
                        title = "No recommendations yet",
                        message = "Rank some movies to get personalized suggestions",
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                    )
                }

                RecommendationState.CONTENT -> {
                    val dayOfYear = remember { LocalDate.now().dayOfYear }
                    val requestedEntry = remember(dayOfYear, featuredMovieOffset) {
                        MovieQuoteProvider.entryForIndex(dayOfYear + featuredMovieOffset)
                    }
                    var currentEntry by remember { mutableStateOf(requestedEntry) }
                    var currentMovie by remember { mutableStateOf<Movie?>(null) }

                    LaunchedEffect(requestedEntry, uiState.recommendations) {
                        val entry = requestedEntry
                        if (entry.title.isBlank()) {
                            uiState.recommendations.firstOrNull()?.let { fallback ->
                                currentEntry = entry
                                currentMovie = fallback
                            }
                            return@LaunchedEffect
                        }

                        val directMatch = uiState.recommendations.firstOrNull {
                            MovieQuoteProvider.matchesTitle(it.title, entry.title)
                        }
                        val searched = directMatch ?: recommendationViewModel.findMovieByTitle(entry.title)
                        val fallback = if (searched == null && uiState.recommendations.isNotEmpty()) {
                            val size = uiState.recommendations.size
                            val safeIndex = ((featuredMovieOffset % size) + size) % size
                            uiState.recommendations[safeIndex]
                        } else null
                        val resolved = searched ?: fallback
                        if (resolved != null) {
                            currentEntry = entry
                            currentMovie = resolved
                        }
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(padding)
                    ) {
                        LazyColumn(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            // Featured movie card
                            currentMovie?.let { movie ->
                                item {
                                    FeaturedMovieCard(
                                        movie = movie,
                                        quote = currentEntry.quote,
                                        onClick = { selectedMovie = movie },
                                        onRefresh = { featuredMovieOffset++ },
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }
                            }

                            // Section title
                            item {
                                Text(
                                    text = if (uiState.isShowingTrending) "Trending Now" else "Recommended for You",
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(top = 8.dp)
                                )
                            }

                            // Recommendation cards
                            items(uiState.recommendations, key = { it.id }) { movie ->
                                RecommendationCard(
                                    movie = movie,
                                    onClick = { selectedMovie = movie },
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }

                        selectedMovie?.let { movie ->
                            // Fetch trailer when movie is selected
                            LaunchedEffect(movie.id) {
                                val result = recommendationViewModel.getMovieVideos(movie.id)
                                trailerKey = when (result) {
                                    is com.cpen321.movietier.data.repository.Result.Success -> result.data?.key
                                    else -> null
                                }
                            }

                            MovieDetailBottomSheet(
                                movie = movie,
                                onAddToRanking = {
                                    rankingViewModel.addMovieFromSearch(movie)
                                    // Sheet will close when success/error message is received
                                },
                                onPlayTrailer = trailerKey?.let {
                                    {
                                        trailerMovieTitle = movie.title
                                        showTrailerDialog = true
                                    }
                                },
                                onOpenWhereToWatch = {
                                    scope.launch {
                                        // Prefer exact TMDB watch page for the movie
                                        val tmdbLink = "https://www.themoviedb.org/movie/${movie.id}/watch?locale=${country}"
                                        try {
                                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(tmdbLink))
                                            context.startActivity(intent)
                                            return@launch
                                        } catch (_: Exception) {}

                                        when (val res = recommendationViewModel.getWatchProviders(movie.id, country)) {
                                            is com.cpen321.movietier.data.repository.Result.Success -> {
                                                val link = res.data.link
                                                val providers = buildList {
                                                    addAll(res.data.providers.flatrate)
                                                    addAll(res.data.providers.rent)
                                                    addAll(res.data.providers.buy)
                                                }.distinct()
                                                if (!link.isNullOrBlank()) {
                                                    try {
                                                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(link))
                                                        context.startActivity(intent)
                                                    } catch (e: Exception) {
                                                        snackbarHostState.showSnackbar("Available on: ${providers.joinToString()}")
                                                    }
                                                } else if (providers.isNotEmpty()) {
                                                    snackbarHostState.showSnackbar("Available on: ${providers.joinToString()}")
                                                } else {
                                                    snackbarHostState.showSnackbar("No streaming info found")
                                                }
                                            }
                                            is com.cpen321.movietier.data.repository.Result.Error -> {
                                                snackbarHostState.showSnackbar(res.message ?: "Failed to load providers")
                                            }
                                            else -> {}
                                        }
                                    }
                                },
                                onAddToWatchlist = {
                                    recommendationViewModel.addToWatchlist(movie)
                                    // Close sheet so snackbar is visible immediately
                                    selectedMovie = null
                                },
                                onDismissRequest = {
                                    selectedMovie = null
                                    trailerKey = null
                                }
                            )
                        }

                        // Trailer Player Dialog
                        if (showTrailerDialog && trailerKey != null) {
                            YouTubePlayerDialog(
                                videoKey = trailerKey!!,
                                movieTitle = trailerMovieTitle,
                                onDismiss = {
                                    showTrailerDialog = false
                                }
                            )
                        }

                        // Comparison Dialog
                        if (compareState != null) {
                            val state = compareState!!
                            AlertDialog(
                                onDismissRequest = { /* Disabled during ranking */ },
                                title = { Text("Which movie do you prefer?") },
                                text = {
                                    Column(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalArrangement = Arrangement.spacedBy(16.dp)
                                    ) {
                                        Text(
                                            "Help us place '${state.newMovie.title}' in your rankings:",
                                            style = MaterialTheme.typography.bodyMedium
                                        )

                                        // Side-by-side posters with clickable movie names
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                                        ) {
                                            // First movie
                                            Column(
                                                modifier = Modifier.weight(1f),
                                                horizontalAlignment = Alignment.CenterHorizontally,
                                                verticalArrangement = Arrangement.spacedBy(8.dp)
                                            ) {
                                                AsyncImage(
                                                    model = state.newMovie.posterPath?.let { "https://image.tmdb.org/t/p/w342$it" },
                                                    contentDescription = state.newMovie.title,
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .aspectRatio(2f / 3f)
                                                        .clip(MaterialTheme.shapes.medium),
                                                    contentScale = ContentScale.Crop
                                                )
                                                Button(
                                                    onClick = {
                                                        rankingViewModel.compareMovies(
                                                            newMovie = state.newMovie,
                                                            compareWith = state.compareWith,
                                                            preferredMovie = state.newMovie
                                                        )
                                                    },
                                                    modifier = Modifier.fillMaxWidth()
                                                ) {
                                                    Text(
                                                        state.newMovie.title,
                                                        maxLines = 2,
                                                        overflow = TextOverflow.Ellipsis,
                                                        style = MaterialTheme.typography.bodySmall
                                                    )
                                                }
                                            }

                                            // Second movie
                                            Column(
                                                modifier = Modifier.weight(1f),
                                                horizontalAlignment = Alignment.CenterHorizontally,
                                                verticalArrangement = Arrangement.spacedBy(8.dp)
                                            ) {
                                                AsyncImage(
                                                    model = state.compareWith.posterPath?.let { "https://image.tmdb.org/t/p/w342$it" },
                                                    contentDescription = state.compareWith.title,
                                                    modifier = Modifier
                                                        .fillMaxWidth()
                                                        .aspectRatio(2f / 3f)
                                                        .clip(MaterialTheme.shapes.medium),
                                                    contentScale = ContentScale.Crop
                                                )
                                                Button(
                                                    onClick = {
                                                        rankingViewModel.compareMovies(
                                                            newMovie = state.newMovie,
                                                            compareWith = state.compareWith,
                                                            preferredMovie = state.compareWith
                                                        )
                                                    },
                                                    modifier = Modifier.fillMaxWidth()
                                                ) {
                                                    Text(
                                                        state.compareWith.title,
                                                        maxLines = 2,
                                                        overflow = TextOverflow.Ellipsis,
                                                        style = MaterialTheme.typography.bodySmall
                                                    )
                                                }
                                            }
                                        }
                                    }
                                },
                                confirmButton = {},
                                dismissButton = {}
                            )
                        }
                    }
                }
            }
        }
    }

    // Listen to ranking events
    LaunchedEffect(Unit) {
        rankingViewModel.events.collect { event ->
            when (event) {
                is com.cpen321.movietier.ui.viewmodels.RankingEvent.Message -> {
                    // Close bottom sheet so message is visible at top
                    selectedMovie = null
                    snackbarHostState.showSnackbar(event.text)
                }
                is com.cpen321.movietier.ui.viewmodels.RankingEvent.Error -> {
                    // Close bottom sheet so error message is visible at top
                    selectedMovie = null
                    snackbarHostState.showSnackbar(event.text)
                }
            }
        }
    }
}

private enum class RecommendationState {
    LOADING, ERROR, EMPTY, CONTENT
}

private fun getFeaturedMovieOfDay(
    recommendations: List<com.cpen321.movietier.data.model.Movie>,
    offset: Int = 0
): Pair<com.cpen321.movietier.data.model.Movie, String>? {
    // Use all recommendations to avoid starving the feature when few are 8.0+
    val eligibleMovies = recommendations
    if (eligibleMovies.isEmpty()) return null

    // Use day of year + offset to pick a movie (offset increments on refresh)
    val dayOfYear = java.time.LocalDate.now().dayOfYear
    val index = (dayOfYear + offset) % eligibleMovies.size
    val movie = eligibleMovies[index]

    // Curated database of SHORT famous movie quotes (1-2 sentences max)
    // Note: TMDB API doesn't provide movie dialogue/quotes
    val movieQuotesByTitle = mapOf(
        // Classic Cinema (Pre-2000)
        "The Shawshank Redemption" to "Get busy living, or get busy dying.",
        "The Godfather" to "I'm gonna make him an offer he can't refuse.",
        "The Godfather Part II" to "Keep your friends close, but your enemies closer.",
        "The Dark Knight" to "Why so serious?",
        "12 Angry Men" to "It's always difficult to keep personal prejudice out.",
        "Schindler's List" to "Whoever saves one life, saves the world entire.",
        "The Lord of the Rings: The Return of the King" to "I can't carry it for you, but I can carry you!",
        "Pulp Fiction" to "Say 'what' again!",
        "The Lord of the Rings: The Fellowship of the Ring" to "You shall not pass!",
        "Forrest Gump" to "Life is like a box of chocolates.",
        "The Good, the Bad and the Ugly" to "There are two kinds of people: those with loaded guns and those who dig.",
        "Fight Club" to "His name is Robert Paulson.",
        "The Lord of the Rings: The Two Towers" to "The battle for Helm's Deep is over. The battle for Middle-earth is about to begin.",
        "The Empire Strikes Back" to "No. I am your father.",
        "The Matrix" to "There is no spoon.",
        "Goodfellas" to "As far back as I can remember, I always wanted to be a gangster.",
        "One Flew Over the Cuckoo's Nest" to "But I tried, didn't I? At least I did that.",
        "Se7en" to "What's in the box?",
        "Seven Samurai" to "This is the nature of war. By protecting others, you save yourselves.",
        "It's a Wonderful Life" to "Every time a bell rings, an angel gets his wings.",
        "The Silence of the Lambs" to "Hello, Clarice.",
        "Saving Private Ryan" to "Earn this.",
        "City of God" to "If you run, the beast catches you. If you stay, the beast eats you.",
        "Life Is Beautiful" to "Buongiorno, Principessa!",
        "The Green Mile" to "I'm tired, boss.",
        "American History X" to "Hate is baggage. Life's too short to be pissed off all the time.",
        "Cinema Paradiso" to "Whatever you end up doing, love it.",
        "Psycho" to "We all go a little mad sometimes.",
        "Casablanca" to "Here's looking at you, kid.",
        "City Lights" to "Tomorrow the birds will sing.",
        "The Usual Suspects" to "The greatest trick the Devil ever pulled was convincing the world he didn't exist.",
        "Léon: The Professional" to "This is from Mathilda.",
        "The Pianist" to "I'm still here.",
        "The Departed" to "I'm the guy who does his job. You must be the other guy.",
        "Apocalypse Now" to "I love the smell of napalm in the morning.",
        "Memento" to "I have to believe in a world outside my own mind.",
        "The Prestige" to "Are you watching closely?",
        "Gladiator" to "Are you not entertained?",
        "The Lion King" to "Remember who you are.",
        "Terminator 2: Judgment Day" to "Hasta la vista, baby.",
        "Back to the Future" to "Where we're going, we don't need roads.",
        "Whiplash" to "Not quite my tempo.",
        "The Intouchables" to "No arms, no chocolate.",
        "Modern Times" to "Smile!",
        "Once Upon a Time in the West" to "People scare better when they're dying.",
        "Alien" to "In space, no one can hear you scream.",
        "American Beauty" to "Sometimes there's so much beauty in the world.",
        "The Shining" to "Here's Johnny!",
        "Braveheart" to "They may take our lives, but they'll never take our freedom!",
        "The Great Dictator" to "You are not machines! You are men!",
        "Amadeus" to "Mediocrities everywhere, I absolve you!",
        "Witness for the Prosecution" to "The question is: Were you lying then, or are you lying now?",
        "Paths of Glory" to "I apologize for not being entirely honest with you.",
        "A Clockwork Orange" to "I was cured all right!",
        "Good Will Hunting" to "It's not your fault.",
        "The Truman Show" to "Good morning, and in case I don't see ya, good afternoon.",
        "Rocky" to "Yo, Adrian!",
        "Dead Poets Society" to "Carpe diem. Seize the day.",

        // 2000s Cinema
        "Inception" to "Dream a little bigger, darling.",
        "Interstellar" to "We used to look up at the sky and wonder.",
        "The Dark Knight Rises" to "The fire rises.",
        "WALL-E" to "Eva!",
        "Up" to "Adventure is out there!",
        "Toy Story 3" to "So long, partner.",
        "Finding Nemo" to "Just keep swimming.",
        "Ratatouille" to "Anyone can cook.",
        "The Incredibles" to "No capes!",
        "Monsters, Inc." to "Put that thing back where it came from!",
        "Coco" to "Remember me.",
        "Inside Out" to "Crying helps me slow down and obsess over life.",
        "Gran Torino" to "Get off my lawn.",
        "V for Vendetta" to "Beneath this mask there is more than flesh. Beneath this mask there is an idea.",
        "The Pursuit of Happyness" to "Don't let somebody tell you you can't do something.",
        "Slumdog Millionaire" to "It is written.",
        "The Curious Case of Benjamin Button" to "You never know what's coming for you.",
        "There Will Be Blood" to "I drink your milkshake!",
        "No Country for Old Men" to "Call it, friend-o.",
        "Juno" to "Facing my fear of abandonment made me a more honest person.",
        "Little Miss Sunshine" to "Do what you love, and fuck the rest.",
        "The Butterfly Effect" to "If anyone finds this, it means my plan didn't work.",
        "Eternal Sunshine of the Spotless Mind" to "Meet me in Montauk.",
        "Requiem for a Dream" to "We got a winner!",
        "Hotel Rwanda" to "There will be no rescue, no intervention. We can only save ourselves.",
        "Million Dollar Baby" to "Mo cuishle means 'my darling, my blood.'",
        "The Aviator" to "The way of the future.",
        "Crash" to "You think you know who you are. You have no idea.",
        "Brokeback Mountain" to "I wish I knew how to quit you.",
        "Children of Men" to "Very odd, what happens in a world without children's voices.",
        "Pan's Labyrinth" to "Obey the princess.",
        "The Bourne Identity" to "I don't know who I am.",
        "The Bourne Supremacy" to "Get some rest, Pam. You look tired.",
        "The Bourne Ultimatum" to "This is Jason Bourne.",
        "Prisoners" to "Pray for the best, prepare for the worst.",
        "Zodiac" to "This is the Zodiac speaking.",
        "District 9" to "Get your fookin' tentacle out of my face!",
        "Moon" to "I want to go home.",
        "The Hurt Locker" to "The rush of battle is a potent and often lethal addiction.",
        "Inglourious Basterds" to "That's a bingo!",

        // 2010s Cinema
        "Parasite" to "You know what kind of plan never fails? No plan.",
        "Avengers: Endgame" to "I love you 3000.",
        "Joker" to "You get what you deserve!",
        "Django Unchained" to "The D is silent.",
        "The Wolf of Wall Street" to "I'm not leaving!",
        "Mad Max: Fury Road" to "What a lovely day!",
        "12 Years a Slave" to "I don't want to survive. I want to live.",
        "The Grand Budapest Hotel" to "You see, there are still faint glimmers of civilization left.",
        "Arrival" to "If you could see your whole life from start to finish, would you change things?",
        "Blade Runner 2049" to "I've never retired something that was born before.",
        "La La Land" to "Here's to the ones who dream.",
        "Manchester by the Sea" to "I can't beat it.",
        "Moonlight" to "In moonlight, black boys look blue.",
        "The Revenant" to "As long as you can still grab a breath, you fight.",
        "Birdman" to "Popularity is the slutty little cousin of prestige.",
        "Room" to "I'm not gonna be here anymore.",
        "Spotlight" to "If it takes a village to raise a child, it takes a village to abuse them.",
        "The Big Short" to "I'm jacked to the tits!",
        "Her" to "The past is just a story we tell ourselves.",
        "Gravity" to "I hate space.",
        "Dallas Buyers Club" to "Let me give y'all a little news flash.",
        "Lincoln" to "We're stepped out upon the world stage now.",
        "Life of Pi" to "All of life is an act of letting go.",
        "Les Misérables" to "To love another person is to see the face of God.",
        "Argo" to "Argo fuck yourself.",
        "Drive" to "Do you understand?",
        "The Artist" to "I won't talk! I won't say a word!",
        "Shutter Island" to "Which would be worse: to live as a monster, or to die as a good man?",
        "A Beautiful Mind" to "I need to believe that something extraordinary is possible.",
        "The Social Network" to "If you were the inventors of Facebook, you'd have invented Facebook.",
        "Get Out" to "I would have voted for Obama for a third term.",
        "A Quiet Place" to "*silence*",
        "Dunkirk" to "Where's the bloody air force?",
        "Baby Driver" to "I was just listening to some music.",
        "Logan" to "Don't be what they made you.",
        "Three Billboards Outside Ebbing, Missouri" to "Anger begets greater anger.",
        "The Shape of Water" to "Unable to perceive the shape of you, I find you all around me.",
        "Sicario" to "You're asking me how a watch is made. For now, just keep your eye on the time.",
        "Edge of Tomorrow" to "Come find me when you wake up.",
        "Nightcrawler" to "If you want to win the lottery, you have to make the money to buy a ticket.",
        "Whiplash" to "There are no two words in the English language more harmful than 'good job.'",
        "Gone Girl" to "I'm the cunt you married.",
        "The Imitation Game" to "Sometimes it is the people no one imagines anything of who do the things no one can imagine.",
        "Boyhood" to "You know how everyone's always saying seize the moment?",
        "Ex Machina" to "Isn't it strange, to create something that hates you?",
        "Knives Out" to "I suspect foul play.",

        // 2020s Cinema
        "Everything Everywhere All at Once" to "We can be anything we want.",
        "Dune" to "Fear is the mind-killer.",
        "Dune: Part Two" to "Power over spice is power over all.",
        "Oppenheimer" to "Now I am become Death, the destroyer of worlds.",
        "1917" to "Down to Gehenna or up to the Throne, He travels fastest who travels alone.",
        "Nomadland" to "I'm not homeless, I'm just houseless.",
        "The Power of the Dog" to "What kind of man would I be if I didn't help my mother?",
        "CODA" to "Music is in everything.",
        "Minari" to "You need to learn to follow your own dreams.",
        "The Father" to "I feel as if I'm losing all my leaves.",
        "Promising Young Woman" to "I said, what are you doing?",
        "Mank" to "You cannot capture a man's entire life in two hours.",
        "Sound of Metal" to "The world does keep moving, and it can be a damn cruel place.",
        "Judas and the Black Messiah" to "You can murder a liberator, but you can't murder liberation.",
        "The Trial of the Chicago 7" to "The whole world is watching.",
        "Soul" to "I'm just afraid that if I died today, my life would have amounted to nothing.",
        "No Time to Die" to "We have all the time in the world.",
        "Spider-Man: No Way Home" to "With great power must also come great responsibility.",
        "The Batman" to "I am vengeance.",
        "Top Gun: Maverick" to "Don't think. Just do.",
        "Tár" to "I'm a U-Haul lesbian.",
        "The Banshees of Inisherin" to "There goes that dream.",
        "The Fabelmans" to "Movies are dreams that you never forget.",
        "Glass Onion" to "It's so dumb it's brilliant!",
        "The Whale" to "Do you ever get the feeling that people are incapable of not caring?",
        "Avatar: The Way of Water" to "Family is our fortress.",
        "Black Widow" to "I'm done running from my past.",
        "Shang-Chi" to "You can't outrun your past.",
        "Cruella" to "I am woman. Hear me roar.",
        "The Suicide Squad" to "We're all gonna die!",
        "Free Guy" to "Don't have a good day. Have a great day.",
        "Encanto" to "What else can I do?",
        "Turning Red" to "Honor your parents, but also yourself.",
        "Lightyear" to "To infinity and beyond!",

        // Superhero/Comic Book Films
        "The Avengers" to "I'm always angry.",
        "Avengers: Infinity War" to "I don't feel so good.",
        "Avengers: Age of Ultron" to "I could do this all day.",
        "Spider-Man" to "With great power comes great responsibility.",
        "Spider-Man: Into the Spider-Verse" to "Anyone can wear the mask.",
        "Spider-Man: Homecoming" to "If you're nothing without the suit, then you shouldn't have it.",
        "Black Panther" to "Wakanda forever!",
        "Iron Man" to "I am Iron Man.",
        "Captain America: The First Avenger" to "I can do this all day.",
        "Captain America: The Winter Soldier" to "On your left.",
        "Captain America: Civil War" to "I could do this all day.",
        "Thor" to "I am Thor, son of Odin!",
        "Thor: Ragnarok" to "He's a friend from work!",
        "Guardians of the Galaxy" to "We are Groot.",
        "Guardians of the Galaxy Vol. 2" to "I'm Mary Poppins, y'all!",
        "Doctor Strange" to "Dormammu, I've come to bargain.",
        "Ant-Man" to "It's never just a robbery.",
        "Black Panther: Wakanda Forever" to "Only the most broken people can be great leaders.",
        "Wonder Woman" to "I believe in love.",
        "Wonder Woman 1984" to "Nothing good is born from lies.",
        "Man of Steel" to "You can save them. You can save all of them.",
        "Justice League" to "You can't save the world alone.",
        "Aquaman" to "My father was a lighthouse keeper. My mother was a queen.",
        "Suicide Squad" to "We're bad guys. It's what we do.",
        "X-Men" to "Mutant and proud.",
        "X2" to "Have you tried not being a mutant?",
        "X-Men: Days of Future Past" to "The future: a dark, desolate world.",
        "Logan" to "So this is what it feels like.",
        "Deadpool" to "Maximum effort!",
        "Deadpool 2" to "I'm Batman.",
        "Venom" to "We are Venom.",

        // Fantasy/Adventure
        "The Lord of the Rings" to "My precious.",
        "Harry Potter and the Philosopher's Stone" to "Yer a wizard, Harry.",
        "Harry Potter and the Sorcerer's Stone" to "It does not do to dwell on dreams.",
        "Harry Potter and the Prisoner of Azkaban" to "Happiness can be found in the darkest of times.",
        "Harry Potter and the Deathly Hallows" to "Always.",
        "The Hobbit: An Unexpected Journey" to "In a hole in the ground there lived a hobbit.",
        "The Hobbit: The Desolation of Smaug" to "I am fire. I am death.",
        "The Chronicles of Narnia: The Lion, the Witch and the Wardrobe" to "Once a king or queen of Narnia, always a king or queen.",
        "The Princess Bride" to "As you wish.",
        "Labyrinth" to "You have no power over me.",
        "The NeverEnding Story" to "Turn around, look at what you see.",
        "Willow" to "You are my sun, my moon, my starlit sky.",
        "Stardust" to "A philosopher once asked, 'Are we human because we gaze at the stars?'",
        "The Golden Compass" to "We are all subject to the fates.",
        "Percy Jackson & the Olympians: The Lightning Thief" to "I am Poseidon's son.",
        "Maleficent" to "I revoke my curse!",
        "Alice in Wonderland" to "Why, sometimes I've believed as many as six impossible things before breakfast.",
        "Pan" to "All you need is faith, trust, and a little pixie dust.",
        "The Sorcerer's Apprentice" to "Magic is real.",
        "Pirates of the Caribbean: The Curse of the Black Pearl" to "Why is the rum gone?",
        "Pirates of the Caribbean: Dead Man's Chest" to "I've got a jar of dirt!",
        "Pirates of the Caribbean: At World's End" to "Hoist the colors!",
        "Indiana Jones" to "It belongs in a museum!",
        "Raiders of the Lost Ark" to "Snakes. Why'd it have to be snakes?",
        "Indiana Jones and the Last Crusade" to "He chose poorly.",
        "Jurassic Park" to "Life finds a way.",
        "Jurassic World" to "The world has just changed so radically.",
        "King Kong" to "It was beauty killed the beast.",
        "The Mummy" to "Death is only the beginning.",
        "National Treasure" to "I'm gonna steal the Declaration of Independence.",

        // Animation - Disney/Pixar (Expanded)
        "Toy Story" to "To infinity and beyond!",
        "Toy Story 2" to "You are a toy!",
        "Frozen" to "Let it go.",
        "Frozen II" to "Into the unknown.",
        "Moana" to "I am Moana!",
        "Tangled" to "I have a dream!",
        "Big Hero 6" to "Hello, I am Baymax.",
        "Zootopia" to "Anyone can be anything.",
        "Wreck-It Ralph" to "I'm gonna wreck it!",
        "Ralph Breaks the Internet" to "I'm a wrecker. I wreck things.",
        "The Princess and the Frog" to "Dig a little deeper.",
        "Luca" to "Silenzio, Bruno!",
        "Soul" to "Your spark isn't your purpose.",
        "Brave" to "Our fate lives within us.",
        "Monsters University" to "You're not scary. Not even a little bit.",
        "Cars" to "Ka-chow!",
        "Aladdin" to "You ain't never had a friend like me.",
        "Beauty and the Beast" to "Tale as old as time.",
        "The Little Mermaid" to "Part of your world.",
        "Mulan" to "The flower that blooms in adversity is the most rare.",
        "Pocahontas" to "Listen with your heart.",
        "Hercules" to "I can go the distance.",
        "The Hunchback of Notre Dame" to "Out there.",
        "Tarzan" to "You'll be in my heart.",
        "Fantasia" to "The Sorcerer's Apprentice.",
        "Dumbo" to "You can fly!",
        "Bambi" to "Love is a song that never ends.",
        "Cinderella" to "A dream is a wish your heart makes.",
        "Sleeping Beauty" to "Now you shall deal with me!",
        "Peter Pan" to "All it takes is faith and trust.",
        "101 Dalmatians" to "No time to explain.",
        "The Jungle Book" to "Look for the bare necessities.",
        "The Aristocats" to "Everybody wants to be a cat.",
        "Robin Hood" to "Oo-De-Lally!",
        "The Fox and the Hound" to "We'll always be friends forever.",
        "The Black Cauldron" to "Do you not see the power you hold?",
        "The Great Mouse Detective" to "The game is afoot!",
        "Oliver & Company" to "Why should I worry?",
        "The Rescuers" to "Faith is a bluebird.",
        "Bolt" to "I'm a TV dog.",
        "Meet the Robinsons" to "Keep moving forward.",
        "Treasure Planet" to "I'm gonna be somebody.",
        "Atlantis: The Lost Empire" to "All will be well.",
        "Brother Bear" to "Tell everybody I'm on my way.",
        "Home on the Range" to "Yodel-Adle-Eedle-Idle-Oo.",
        "Chicken Little" to "Today is a new day.",
        "Finding Dory" to "Just keep swimming.",
        "The Good Dinosaur" to "You're me and more.",
        "Onward" to "You're stronger than you think.",
        "The Incredibles 2" to "I never look back, darling!",
        "A Bug's Life" to "First rule of leadership: Everything is your fault.",

        // Animation - Studio Ghibli (Expanded)
        "Spirited Away" to "Once you meet someone, you never really forget them.",
        "My Neighbor Totoro" to "Trees and people used to be good friends.",
        "Howl's Moving Castle" to "A heart's a heavy burden.",
        "Princess Mononoke" to "You cannot alter your fate. However, you can rise to meet it.",
        "Kiki's Delivery Service" to "We fly with our spirit.",
        "Ponyo" to "Ponyo loves Sosuke!",
        "Castle in the Sky" to "No matter how many weapons you have, they won't help!",
        "Grave of the Fireflies" to "Why do fireflies have to die so soon?",
        "The Wind Rises" to "Airplanes are beautiful dreams.",
        "The Tale of the Princess Kaguya" to "We grew up on the moon.",
        "Nausicaä of the Valley of the Wind" to "We are all connected.",
        "Whisper of the Heart" to "If you look hard enough, you'll find treasures.",
        "Porco Rosso" to "I'd rather be a pig than a fascist.",
        "Only Yesterday" to "Memory is a mysterious thing.",
        "Pom Poko" to "We are the tanuki!",
        "My Neighbors the Yamadas" to "Life is always uncertain.",
        "From Up on Poppy Hill" to "I saw the reflection of my face in the water.",
        "The Cat Returns" to "Always believe in yourself.",
        "Arrietty" to "We must never be seen.",
        "The Red Turtle" to "Nature always finds a way.",
        "When Marnie Was There" to "You're my very best friend.",

        // Animation - Other
        "How to Train Your Dragon" to "This is Berk.",
        "How to Train Your Dragon 2" to "You are the Dragon Master.",
        "How to Train Your Dragon: The Hidden World" to "The world believes the dragons are gone.",
        "Kung Fu Panda" to "Yesterday is history, tomorrow is a mystery.",
        "Kung Fu Panda 2" to "Inner peace.",
        "Kung Fu Panda 3" to "You must be the Dragon Warrior.",
        "Shrek" to "Ogres are like onions.",
        "Shrek 2" to "I need a hero.",
        "Madagascar" to "I like to move it, move it.",
        "Despicable Me" to "It's so fluffy!",
        "Megamind" to "Oh, you're a villain alright, just not a super one.",
        "The Lego Movie" to "Everything is awesome!",
        "The Nightmare Before Christmas" to "What's this?",
        "Coraline" to "You're not my mother.",
        "ParaNorman" to "You can't stop bullying. It's part of human nature.",
        "Kubo and the Two Strings" to "If you must blink, do it now.",
        "The Boxtrolls" to "Here be monsters!",
        "Your Name" to "I wanted to meet you.",
        "Weathering with You" to "I want you more than any blue sky.",
        "A Silent Voice" to "I want you to help me live.",
        "5 Centimeters per Second" to "The speed at which cherry blossoms fall.",
        "The Girl Who Leapt Through Time" to "Time waits for no one.",
        "Wolf Children" to "Live however you want.",
        "Summer Wars" to "We are family.",
        "Paprika" to "This is your dream.",
        "Perfect Blue" to "Who are you?",
        "Akira" to "Kaneda!",
        "Ghost in the Shell" to "The net is vast and infinite.",

        // Horror/Thriller
        "The Sixth Sense" to "I see dead people.",
        "The Exorcist" to "The power of Christ compels you!",
        "The Thing" to "Nobody trusts anybody now.",
        "Halloween" to "It was the Boogeyman.",
        "A Nightmare on Elm Street" to "Welcome to my nightmare.",
        "The Texas Chain Saw Massacre" to "Look what your brother did to the door!",
        "Friday the 13th" to "Kill her, mommy!",
        "Scream" to "What's your favorite scary movie?",
        "Saw" to "I want to play a game.",
        "The Ring" to "Seven days.",
        "The Conjuring" to "Do you want to play hide and clap?",
        "The Conjuring 2" to "The crooked man.",
        "Insidious" to "It's not the house that's haunted.",
        "Sinister" to "Don't you dare.",
        "Hereditary" to "I am your mother!",
        "Midsommar" to "May I cut your hair?",
        "Get Out" to "Sink into the floor.",
        "Us" to "We're Americans.",
        "The Cabin in the Woods" to "You've gotta have an endgame.",
        "28 Days Later" to "The infection is unstoppable.",
        "World War Z" to "Most people don't believe something can happen until it already has.",
        "Train to Busan" to "Take care of my daughter.",
        "Let the Right One In" to "I'm twelve. But I've been twelve for a long time.",
        "The Witch" to "Wouldst thou like to live deliciously?",
        "It Follows" to "It could look like anyone.",
        "Don't Breathe" to "Man, this house is creepy.",
        "Hush" to "I can come in anytime I want.",
        "The Babadook" to "The more you deny me, the stronger I'll get.",
        "It" to "You'll float too.",
        "It Chapter Two" to "Hello, Georgie.",
        "Annabelle" to "You let her in.",
        "Paranormal Activity" to "What was that noise?",

        // Sci-Fi (Expanded)
        "E.T. the Extra-Terrestrial" to "E.T. phone home.",
        "The Terminator" to "I'll be back.",
        "Star Wars: A New Hope" to "May the Force be with you.",
        "Star Wars: The Empire Strikes Back" to "Do or do not. There is no try.",
        "Star Wars: Return of the Jedi" to "It's a trap!",
        "Star Wars: The Force Awakens" to "Chewie, we're home.",
        "Star Wars: The Last Jedi" to "Let the past die.",
        "Star Wars: The Rise of Skywalker" to "Be with me.",
        "Rogue One" to "I am one with the Force.",
        "Solo" to "Never tell me the odds.",
        "2001: A Space Odyssey" to "I'm sorry, Dave. I'm afraid I can't do that.",
        "Close Encounters of the Third Kind" to "This means something.",
        "Blade Runner" to "I've seen things you wouldn't believe.",
        "The Fifth Element" to "Leeloo Dallas multipass.",
        "Minority Report" to "Everybody runs.",
        "Contact" to "They should have sent a poet.",
        "Gattaca" to "I never saved anything for the swim back.",
        "Children of Men" to "Pull my finger.",
        "Ex Machina" to "One day the AIs are going to look back on us.",
        "Her" to "Sometimes I think I have felt everything I'm ever gonna feel.",
        "A.I. Artificial Intelligence" to "I am.",
        "Total Recall" to "See you at the party, Richter!",
        "RoboCop" to "Dead or alive, you're coming with me.",
        "The Matrix Reloaded" to "Choice is an illusion.",
        "The Matrix Revolutions" to "Everything that has a beginning has an end.",
        "War of the Worlds" to "They're here.",
        "Independence Day" to "Welcome to Earth!",
        "District 9" to "Get your fookin' tentacle out of my face!",
        "Elysium" to "We can save everyone.",
        "Looper" to "Time travel hasn't been invented yet.",
        "Edge of Tomorrow" to "Come find me when you wake up.",
        "Pacific Rim" to "Today we are cancelling the apocalypse!",
        "Oblivion" to "Are you still an effective team?",
        "Prometheus" to "We were so wrong.",
        "Moon" to "I want to go home.",
        "Source Code" to "Everything is going to be okay.",
        "Snowpiercer" to "The train is the world.",
        "Ender's Game" to "The enemy's gate is down.",
        "Ready Player One" to "Welcome to the OASIS.",
        "Valerian and the City of a Thousand Planets" to "I'll follow you to the end of the universe.",

        // Drama/Inspirational (Expanded)
        "The Green Book" to "The world's full of lonely people afraid to make the first move.",
        "Rain Man" to "I'm an excellent driver.",
        "Catch Me If You Can" to "Two little mice fell in a bucket of cream.",
        "The King's Speech" to "I have a voice!",
        "The Theory of Everything" to "There should be no boundaries to human endeavor.",
        "A Star Is Born" to "I just wanted to take another look at you.",
        "Walk the Line" to "Love is a burning thing.",
        "Ray" to "I was born with music inside me.",
        "The Blind Side" to "You threaten my son, you threaten me.",
        "Hidden Figures" to "We all get to the peak together, or we don't get there at all.",
        "Erin Brockovich" to "Not personal? That is my work, my sweat, and my time away from my kids!",
        "Philadelphia" to "Explain it to me like I'm a four-year-old.",
        "The Help" to "You is kind. You is smart. You is important.",
        "Coach Carter" to "Our deepest fear is not that we are inadequate.",
        "Remember the Titans" to "Left side! Strong side!",
        "Rudy" to "In this lifetime, you don't have to prove nothing to nobody except yourself.",
        "The Karate Kid" to "Wax on, wax off.",
        "Field of Dreams" to "If you build it, he will come.",
        "Jerry Maguire" to "Show me the money!",
        "The Fighter" to "I'm the one fighting. Not you, not you, and not you.",
        "Million Dollar Baby" to "Tough ain't enough.",
        "Creed" to "One step at a time.",
        "Warrior" to "It doesn't matter what I think.",
        "The Wrestler" to "I'm the one in the ring.",
        "Raging Bull" to "You never got me down, Ray.",
        "On the Waterfront" to "I coulda been a contender.",
        "Network" to "I'm as mad as hell, and I'm not going to take this anymore!",
        "Norma Rae" to "Union!",
        "Silkwood" to "I'm not afraid.",

        // Romance/Comedy (Expanded)
        "Titanic" to "I'm the king of the world!",
        "The Notebook" to "If you're a bird, I'm a bird.",
        "When Harry Met Sally" to "I'll have what she's having.",
        "Love Actually" to "To me, you are perfect.",
        "Notting Hill" to "I'm just a girl, standing in front of a boy.",
        "10 Things I Hate About You" to "But mostly I hate the way I don't hate you.",
        "Pride and Prejudice" to "You have bewitched me, body and soul.",
        "The Fault in Our Stars" to "Okay? Okay.",
        "Me Before You" to "Push yourself. Don't settle.",
        "Call Me by Your Name" to "Is it better to speak or die?",
        "Brokeback Mountain" to "I wish I knew how to quit you.",
        "Eternal Sunshine of the Spotless Mind" to "Meet me in Montauk.",
        "500 Days of Summer" to "Just because she likes the same bizzaro crap you do doesn't mean she's your soul mate.",
        "Silver Linings Playbook" to "I was a big slut, but I'm not anymore.",
        "Crazy, Stupid, Love" to "Be better than the Gap.",
        "Easy A" to "The rumors of my promiscuity have been greatly exaggerated.",
        "The Big Sick" to "I'm really good at ping pong.",
        "Forgetting Sarah Marshall" to "I'm doing a musical.",
        "Knocked Up" to "I'm pregnant.",
        "Bridget Jones's Diary" to "It is a truth universally acknowledged...",
        "Four Weddings and a Funeral" to "Is it still raining? I hadn't noticed.",
        "Pretty Woman" to "Big mistake. Big. Huge.",
        "Sleepless in Seattle" to "It's a sign.",
        "You've Got Mail" to "I wanted it to be you.",
        "The Holiday" to "I'm looking for a lovely little cottage.",
        "Crazy Rich Asians" to "It's about family.",
        "To All the Boys I've Loved Before" to "I like you.",
        "The Proposal" to "Marry me!",
        "27 Dresses" to "Always a bridesmaid, never a bride.",
        "Mamma Mia!" to "The winner takes it all.",
        "La La Land" to "Here's to the fools who dream.",
        "Moulin Rouge!" to "The greatest thing you'll ever learn is just to love.",
        "Dirty Dancing" to "Nobody puts Baby in a corner.",
        "The Princess Diaries" to "Shut up!",
        "A Walk to Remember" to "Love is like the wind.",
        "The Vow" to "I vow to help you love life.",
        "Dear John" to "Two weeks together, that's all it took.",

        // Action/Thriller (Expanded)
        "Die Hard" to "Yippee-ki-yay.",
        "Die Hard 2" to "How can the same shit happen to the same guy twice?",
        "Mad Max: Fury Road" to "What a lovely day!",
        "John Wick" to "Yeah, I'm thinking I'm back.",
        "John Wick: Chapter 2" to "Whoever comes, I'll kill them. I'll kill them all.",
        "John Wick: Chapter 3" to "Guns. Lots of guns.",
        "Mission: Impossible" to "Your mission, should you choose to accept it.",
        "Mission: Impossible - Fallout" to "I'm jumping out of a plane.",
        "The Bourne Identity" to "I don't know who I am.",
        "The Bourne Supremacy" to "Get some rest, Pam. You look tired.",
        "The Bourne Ultimatum" to "This is Jason Bourne.",
        "Casino Royale" to "The name's Bond. James Bond.",
        "Skyfall" to "Sometimes the old ways are the best.",
        "Spectre" to "The dead are alive.",
        "No Time to Die" to "We have all the time in the world.",
        "Taken" to "I will find you, and I will kill you.",
        "The Equalizer" to "Got to be who you are in this world.",
        "Leon: The Professional" to "This is from Mathilda.",
        "Heat" to "Don't let yourself get attached to anything.",
        "Collateral" to "Millions of galaxies of hundreds of millions of stars.",
        "Drive" to "Do you understand?",
        "Baby Driver" to "I was just listening to some music.",
        "Atomic Blonde" to "I'm my own bitch.",
        "Salt" to "Who is Salt?",
        "Red" to "I'm getting the pig.",
        "Kingsman: The Secret Service" to "Manners maketh man.",
        "Kingsman: The Golden Circle" to "Oxfords, not brogues.",
        "The Man from U.N.C.L.E." to "For a special agent, you're not having a very special day.",
        "Jason Bourne" to "I remember everything.",
        "The Accountant" to "I'm here to help you.",
        "Sicario" to "You're asking me how a watch is made.",
        "Sicario: Day of the Soldado" to "You're going to help me start a war.",
        "Jack Reacher" to "You wanted me. You got me.",
        "Jack Ryan: Shadow Recruit" to "I'm operational.",
        "The Fugitive" to "I don't care!",
        "The Rock" to "I'll take pleasure in guttin' you, boy.",
        "Face/Off" to "I could eat a peach for hours.",
        "Speed" to "Pop quiz, hotshot.",
        "Point Break" to "I am an F.B.I. agent!",
        "Con Air" to "Put the bunny back in the box.",
        "Lethal Weapon" to "I'm too old for this shit.",
        "Bad Boys" to "We ride together, we die together.",
        "Bad Boys II" to "This is bad boys, we ain't got no good boys.",

        // War Films
        "Saving Private Ryan" to "Earn this.",
        "1917" to "Down to Gehenna or up to the Throne, He travels fastest who travels alone.",
        "Dunkirk" to "Where's the bloody air force?",
        "Hacksaw Ridge" to "With the world so set on tearing itself apart, it don't seem like such a bad thing to me to want to put a little bit of it back together.",
        "Apocalypse Now" to "I love the smell of napalm in the morning.",
        "Full Metal Jacket" to "This is my rifle.",
        "Platoon" to "I think now, looking back, we did not fight the enemy; we fought ourselves.",
        "Black Hawk Down" to "It's about the man next to you.",
        "American Sniper" to "I'm willing to meet my Creator and answer for every shot that I took.",
        "Lone Survivor" to "Never out of the fight.",
        "13 Hours" to "You can't put a price on being able to live with yourself.",
        "We Were Soldiers" to "I will leave no one behind.",
        "The Hurt Locker" to "The rush of battle is a potent and often lethal addiction.",
        "Jarhead" to "Welcome to the suck.",
        "Zero Dark Thirty" to "I'm gonna smoke everyone involved in this op.",
        "The Thin Red Line" to "War doesn't ennoble men.",
        "Come and See" to "I wanted revenge, but there's nothing to take revenge on.",
        "Paths of Glory" to "I apologize for not being entirely honest with you.",
        "All Quiet on the Western Front" to "This book is to be neither an accusation nor a confession.",
        "The Bridge on the River Kwai" to "Madness! Madness!",
        "Lawrence of Arabia" to "Nothing is written.",
        "The Deer Hunter" to "One shot.",
        "Born on the Fourth of July" to "I'm paralyzed from the mid-chest down.",
        "The Pianist" to "I'm still here.",
        "Schindler's List" to "This list is an absolute good.",
        "Hotel Rwanda" to "There will be no rescue, no intervention.",
        "The Killing Fields" to "Nothing to forgive, Sydney."
    )

    // Normalize the movie title for precise matching
    val normalizedTitle = movie.title.lowercase().trim()
        .replace(":", "")
        .replace("-", " ")
        .replace("  ", " ")

    var quote: String? = null

    // Try exact title match first
    quote = movieQuotesByTitle[movie.title]

    // If no exact match, try normalized exact match
    if (quote == null) {
        quote = movieQuotesByTitle.entries.firstOrNull { (key, _) ->
            key.lowercase().trim()
                .replace(":", "")
                .replace("-", " ")
                .replace("  ", " ") == normalizedTitle
        }?.value
    }

    // Try matching if database key is contained within movie title (for sequels/subtitles)
    if (quote == null) {
        quote = movieQuotesByTitle.entries.firstOrNull { (key, _) ->
            val normalizedKey = key.lowercase().trim()
                .replace(":", "")
                .replace("-", " ")
                .replace("  ", " ")
            normalizedTitle.contains(normalizedKey) && normalizedKey.length > 5
        }?.value
    }

    // If we have a curated quote for the selected movie, use it
    if (quote != null) {
        return Pair(movie, quote)
    }

    // Fallback: Use movie-related inspirational messages instead of plot descriptions
    // These are generic but feel more like quotes than showing the movie description
    val year = movie.releaseDate?.take(4)?.toIntOrNull()
    val decade = year?.let { "${(it / 10) * 10}s" }

    val fallbackMessages = listOf(
        // Movie-watching themed
        "A cinematic experience awaits.",
        "Every frame tells a story.",
        "The magic of movies never fades.",
        "Cinema is a mirror of the soul.",
        "Stories that move us, moments that stay.",
        "Where imagination comes to life.",
        "A journey worth taking.",
        "The art of storytelling at its finest.",
        "Movies: our shared dreams.",
        "Let the story unfold.",

        // Time/era themed (adds variety based on release date)
        decade?.let { "A $it classic." },
        year?.let { if (it >= 2020) "Modern cinema at its best." else null },
        year?.let { if (it < 1980) "Timeless storytelling." else null },

        // Rating-based
        movie.voteAverage?.let { if (it >= 8.0) "Critically acclaimed masterpiece." else null },
        movie.voteAverage?.let { if (it >= 7.0) "A crowd favorite." else null }
    ).filterNotNull()

    val fallback = fallbackMessages[index % fallbackMessages.size]
    return Pair(movie, fallback)
}
