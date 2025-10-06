package application.urdle.utilities;

import java.io.FileWriter;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Fetches 5-letter Urdu words in Urdu script from Wiktionary API and saves to JSON
 *
 * Add to build.gradle:
 * dependencies {
 *     implementation 'org.json:json:20230227'
 * }
 */
public class UrduWordsGenerator {

    private static final String BASE_URL = "https://en.wiktionary.org/w/api.php";
    private static final int MAX_PAGES = 100;
    private static final int WORD_LENGTH = 4;

    // Multiple categories to fetch from - Add more to get even more words!
    private static final String[] CATEGORIES = {
            // Basic word types
            "Category:Urdu_lemmas",
            "Category:Urdu_nouns",
            "Category:Urdu_adjectives",
            "Category:Urdu_verbs",
            "Category:Urdu_adverbs",
            "Category:Urdu_conjunctions",
            "Category:Urdu_determiners",
            "Category:Urdu_interjections",
            "Category:Urdu_pronouns",
            "Category:Urdu_prepositions",
            "Category:Urdu_numerals",

    };

    public static void main(String[] args) {
        try {
            UrduWordsGenerator fetcher = new UrduWordsGenerator();
            List<String> fiveLetterWords = fetcher.fetchFiveLetterUrduWords();
            fetcher.saveToJson(fiveLetterWords, "urdu_4_letter_words.json");

            System.out.println("✅ JSON file generated!");
            System.out.println("Total 4-letter Urdu words: " + fiveLetterWords.size());

            // Show first 15 words as example
            System.out.println("\nExample words:");
            for (int i = 0; i < Math.min(15, fiveLetterWords.size()); i++) {
                System.out.println("  " + fiveLetterWords.get(i));
            }

        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public List<String> fetchFiveLetterUrduWords() throws IOException, InterruptedException {
        HttpClient client = HttpClient.newHttpClient();
        List<String> fiveLetterWords = new ArrayList<>();

        // Fetch from multiple categories
        for (String category : CATEGORIES) {
            System.out.println("\n📚 Fetching from: " + category);
            int beforeCount = fiveLetterWords.size();
            fetchFromCategory(client, category, fiveLetterWords);
            int addedCount = fiveLetterWords.size() - beforeCount;
            System.out.println("✅ Added " + addedCount + " words from this category");
        }

        // Remove duplicates
        List<String> uniqueWords = new ArrayList<>();
        for (String word : fiveLetterWords) {
            if (!uniqueWords.contains(word)) {
                uniqueWords.add(word);
            }
        }

        System.out.println("\n" + "=".repeat(50));
        System.out.println("📊 SUMMARY:");
        System.out.println("Total words fetched: " + fiveLetterWords.size());
        System.out.println("Duplicates removed: " + (fiveLetterWords.size() - uniqueWords.size()));
        System.out.println("🎯 Final unique 5-letter words: " + uniqueWords.size());
        System.out.println("=".repeat(50));
        return uniqueWords;
    }

    private void fetchFromCategory(HttpClient client, String category, List<String> wordList)
            throws IOException, InterruptedException {
        String continueToken = null;

        for (int i = 0; i < MAX_PAGES; i++) {
            String url = buildCategoryUrl(category, continueToken);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "UrduWordleApp/1.0")
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response = client.send(request,
                    HttpResponse.BodyHandlers.ofString());

            JSONObject jsonResponse = new JSONObject(response.body());

            if (jsonResponse.has("query")) {
                JSONObject query = jsonResponse.getJSONObject("query");
                if (query.has("categorymembers")) {
                    JSONArray members = query.getJSONArray("categorymembers");

                    for (int j = 0; j < members.length(); j++) {
                        JSONObject member = members.getJSONObject(j);
                        String title = member.getString("title");

                        // Check if it's pure Urdu script (contains Urdu characters)
                        // and has no spaces (single word only)
                        if (isUrduScript(title) && title.length() == WORD_LENGTH && !title.contains(" ")) {
                            wordList.add(title);
                        }
                    }
                }
            }

            // Check for continuation
            if (jsonResponse.has("continue")) {
                JSONObject continueObj = jsonResponse.getJSONObject("continue");
                if (continueObj.has("cmcontinue")) {
                    continueToken = continueObj.getString("cmcontinue");
                } else {
                    break;
                }
            } else {
                break;
            }

            System.out.println("  Page " + (i + 1) +
                    " - words in this category so far: " + wordList.size());

            // Add a small delay to be nice to the API
            Thread.sleep(100);
        }
    }

    private String buildCategoryUrl(String category, String continueToken) {
        StringBuilder url = new StringBuilder(BASE_URL);
        url.append("?action=query&list=categorymembers");
        url.append("&cmtitle=").append(category);
        url.append("&cmlimit=500&format=json");

        if (continueToken != null) {
            try {
                url.append("&cmcontinue=").append(URLEncoder.encode(continueToken, StandardCharsets.UTF_8));
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        return url.toString();
    }

    private boolean isUrduScript(String text) {
        // Check if string contains Urdu/Arabic script characters
        // Urdu uses Arabic script with Unicode range 0600-06FF
        for (char c : text.toCharArray()) {
            if (c >= '\u0600' && c <= '\u06FF') {
                return true;
            }
        }
        return false;
    }

    private void saveToJson(List<String> words, String filename) throws IOException {
        JSONObject jsonObject = new JSONObject();
        jsonObject.put("words", words);
        jsonObject.put("count", words.size());
        jsonObject.put("wordLength", WORD_LENGTH);
        jsonObject.put("script", "Urdu (Arabic script)");

        try (FileWriter file = new FileWriter(filename, StandardCharsets.UTF_8)) {
            file.write(jsonObject.toString(2)); // Pretty print with indent of 2
            file.flush();
        }
    }
}