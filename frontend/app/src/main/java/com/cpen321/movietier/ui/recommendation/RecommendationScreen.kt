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
import kotlinx.coroutines.withTimeoutOrNull

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
                    // Get featured movie of the day using all recommendations (includes trending from TMDB)
                    val featuredMovieData = remember(uiState.recommendations, featuredMovieOffset) {
                        getFeaturedMovieOfDay(uiState.recommendations, featuredMovieOffset)
                    }
                    var overrideQuote by remember(featuredMovieData?.first?.id) { mutableStateOf<String?>(null) }
                    LaunchedEffect(featuredMovieData?.first?.id) {
                        overrideQuote = null
                        featuredMovieData?.first?.let { m ->
                            val year = m.releaseDate?.take(4)
                            val fetched = withTimeoutOrNull(3500) {
                                when (val res = recommendationViewModel.getMovieQuote(m.title, year)) {
                                    is com.cpen321.movietier.data.repository.Result.Success -> res.data
                                    else -> null
                                }
                            }
                            if (!fetched.isNullOrBlank()) {
                                overrideQuote = fetched
                            }
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
                            featuredMovieData?.let { (movie, quote) ->
                                item {
                                    FeaturedMovieCard(
                                        movie = movie,
                                        quote = overrideQuote ?: quote,
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
                                    selectedMovie = null
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
        // Classic Cinema
        "The Shawshank Redemption" to "Get busy living, or get busy dying.",
        "The Godfather" to "I'm gonna make him an offer he can't refuse.",
        "The Dark Knight" to "Why so serious?",
        "Forrest Gump" to "Life is like a box of chocolates.",
        "The Matrix" to "There is no spoon.",
        "Inception" to "Dream a little bigger, darling.",
        "Interstellar" to "We used to look up at the sky and wonder.",
        "Gladiator" to "Are you not entertained?",
        "Casablanca" to "Here's looking at you, kid.",
        "The Silence of the Lambs" to "Hello, Clarice.",
        "Good Will Hunting" to "It's not your fault.",
        "The Pursuit of Happyness" to "Don't let somebody tell you you can't do something.",
        "Schindler's List" to "Whoever saves one life, saves the world entire.",
        "Pulp Fiction" to "Say 'what' again!",
        "Fight Club" to "His name is Robert Paulson.",
        "The Green Mile" to "I'm tired, boss.",

        // Superhero Films
        "The Avengers" to "I'm always angry.",
        "Spider-Man" to "With great power comes great responsibility.",
        "Spider-Man: Into the Spider-Verse" to "Anyone can wear the mask.",
        "Black Panther" to "Wakanda forever!",
        "Iron Man" to "I am Iron Man.",
        "Captain America" to "I can do this all day.",
        "Wonder Woman" to "I believe in love.",
        "Thor" to "I am Thor, son of Odin!",
        "Guardians of the Galaxy" to "We are Groot.",
        "Doctor Strange" to "Dormammu, I've come to bargain.",

        // Fantasy/Adventure
        "The Lord of the Rings" to "You shall not pass!",
        "Harry Potter" to "Always.",
        "The Hobbit" to "In a hole in the ground there lived a hobbit.",
        "Star Wars" to "May the Force be with you.",
        "The Princess Bride" to "As you wish.",
        "Pirates of the Caribbean" to "Why is the rum gone?",
        "Chronicles of Narnia" to "Once a king or queen of Narnia, always a king or queen.",

        // Animation - Disney/Pixar
        "The Lion King" to "Remember who you are.",
        "Toy Story" to "To infinity and beyond!",
        "Finding Nemo" to "Just keep swimming.",
        "Up" to "Adventure is out there!",
        "WALL-E" to "Eva!",
        "Coco" to "Remember me.",
        "Inside Out" to "Crying helps me slow down and obsess over life.",
        "Moana" to "I am Moana!",
        "Frozen" to "Let it go.",
        "Zootopia" to "Anyone can be anything.",
        "Ratatouille" to "Anyone can cook.",
        "Brave" to "Our fate lives within us.",
        "The Incredibles" to "No capes!",
        "Monsters Inc." to "Put that thing back where it came from!",
        "Aladdin" to "You ain't never had a friend like me.",
        "Beauty and the Beast" to "Tale as old as time.",
        "Mulan" to "The flower that blooms in adversity is the most rare.",
        "Tangled" to "I have a dream!",
        "Big Hero 6" to "Hello, I am Baymax.",

        // Animation - Studio Ghibli
        "Spirited Away" to "Once you meet someone, you never really forget them.",
        "My Neighbor Totoro" to "Trees and people used to be good friends.",
        "Howl's Moving Castle" to "A heart's a heavy burden.",
        "Princess Mononoke" to "You cannot alter your fate. However, you can rise to meet it.",
        "Kiki's Delivery Service" to "We fly with our spirit.",
        "Ponyo" to "Ponyo loves Sosuke!",
        "Castle in the Sky" to "No matter how many weapons you have, they won't help!",

        // Animation - Other
        "How to Train Your Dragon" to "This is Berk.",
        "Kung Fu Panda" to "Yesterday is history, tomorrow is a mystery.",
        "Shrek" to "Ogres are like onions.",
        "Your Name" to "I wanted to meet you.",
        "A Silent Voice" to "I want you to help me live.",
        "The Nightmare Before Christmas" to "What's this?",

        // Drama/Inspirational
        "Dead Poets Society" to "Carpe diem. Seize the day.",
        "A Beautiful Mind" to "I need to believe that something extraordinary is possible.",
        "Life Is Beautiful" to "Buongiorno, Principessa!",
        "The Truman Show" to "Good morning, and in case I don't see ya, good afternoon.",
        "Rocky" to "Yo, Adrian!",
        "Jerry Maguire" to "You had me at hello.",

        // Sci-Fi
        "Back to the Future" to "Where we're going, we don't need roads.",
        "Blade Runner" to "I've seen things you wouldn't believe.",
        "E.T." to "E.T. phone home.",
        "The Terminator" to "I'll be back.",
        "Avatar" to "I see you.",
        "Alien" to "In space, no one can hear you scream.",
        "2001: A Space Odyssey" to "I'm sorry, Dave. I'm afraid I can't do that.",

        // Romance/Comedy
        "Titanic" to "I'm the king of the world!",
        "The Notebook" to "If you're a bird, I'm a bird.",
        "When Harry Met Sally" to "I'll have what she's having.",
        "Love Actually" to "To me, you are perfect.",
        "Notting Hill" to "I'm just a girl, standing in front of a boy.",
        "10 Things I Hate About You" to "But mostly I hate the way I don't hate you.",

        // Action/Thriller
        "Die Hard" to "Yippee-ki-yay.",
        "Mad Max: Fury Road" to "What a lovely day!",
        "John Wick" to "Yeah, I'm thinking I'm back.",
        "Mission: Impossible" to "Your mission, should you choose to accept it.",
        "The Bourne Identity" to "I don't know who I am.",

        // More Recent Films
        "Parasite" to "You know what kind of plan never fails? No plan.",
        "La La Land" to "Here's to the ones who dream.",
        "Whiplash" to "Not quite my tempo.",
        "1917" to "Down to Gehenna or up to the Throne, He travels fastest who travels alone.",
        "Joker" to "You get what you deserve!",
        "Get Out" to "I would have voted for Obama for a third term.",
        "A Quiet Place" to "*silence*",
        "Knives Out" to "I suspect foul play.",
        "Dune" to "Fear is the mind-killer.",
        "Everything Everywhere All at Once" to "We can be anything we want."
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

    // Fallback: derive a short, inspiring line from the movie's overview when no curated quote exists
    val overviewQuote = movie.overview?.let { buildQuoteFromOverview(it) }
    if (!overviewQuote.isNullOrBlank()) {
        return Pair(movie, overviewQuote)
    }

    // Last resort: generic uplifting line (seeded by index for variety across days)
    val generics = listOf(
        "Believe in the journey.",
        "Hope is a powerful thing.",
        "Find your inner strength.",
        "Every choice writes our story.",
        "Courage changes everything."
    )
    val generic = generics[index % generics.size]
    return Pair(movie, generic)
}

private fun buildQuoteFromOverview(overview: String): String? {
    // Take the first sentence or a concise snippet (<= 120 chars)
    val trimmed = overview.trim()
    if (trimmed.isBlank()) return null
    val sentenceEnd = listOf('.', '!', '?')
        .map { ch -> trimmed.indexOf(ch).takeIf { it >= 0 } ?: Int.MAX_VALUE }
        .minOrNull() ?: Int.MAX_VALUE

    val candidate = if (sentenceEnd != Int.MAX_VALUE) {
        trimmed.substring(0, sentenceEnd + 1).trim()
    } else trimmed

    val concise = if (candidate.length <= 120) candidate else candidate.take(117).trimEnd() + "…"
    return if (concise.length >= 12) "\"$concise\"" else null
}
