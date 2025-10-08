package application.urdle.controller;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.client.RestTemplate;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Controller
public class UrdleHomePage {

    private final JSONArray wordArray;
    private final RestTemplate restTemplate = new RestTemplate();
    private final Map<String, Boolean> cache = new ConcurrentHashMap<>();

//    private static final String[] WORDS = {
//            "زندگی","انسان","قانون","تعلیم","حقیقت","حالات","تصویر","بازار","حکومت","عدالت",
//            "عمارت","پرانی","کہانی","ستارہ","قدرتی","مدرسہ","رمضان","اخبار","خبریں","شاگرد",
//            "استاد","مزدور","مضبوط","تجارت","ارادہ","احساس","تحریر","روایت","سیاست","طبیعت",
//            "نظریہ","دہلیز","گلابی","قدیمی","کتابی","شوقین","کھڑکی","طالبہ","پرچمی","دفتری"
//    };


    public UrdleHomePage() {
        // Load once from resources
        InputStream input = getClass().getResourceAsStream("/static/words/urdu_5_letter_words.json");
        if (input == null) throw new RuntimeException("Word list not found in resources/static/words/");
        JSONObject json = new JSONObject(new JSONTokener(input));
        this.wordArray = json.getJSONArray("words");
    }

    @GetMapping("/")
    public String getHomePage(Model model) {
        model.addAttribute("word", getTodaysWord());
        System.out.println(getTodaysWord());
        return "index";
    }

    private String getTodaysWord() {
        LocalDate today = LocalDate.now();
        int seed = today.getYear() * 10000 + today.getMonthValue() * 100 + today.getDayOfMonth();
        Random random = new Random(seed);
        int index = random.nextInt(wordArray.length());
        return wordArray.getString(index);
    }

    @GetMapping("/api/check-word")
    @ResponseBody
    public boolean checkWord(@RequestParam String guess) {
        // ✅ Only 5-letter words are valid in Urdle
        if (guess == null || guess.trim().length() != 5) {
            return false;
        }

        // ✅ Cache to avoid hitting API repeatedly
        if (cache.containsKey(guess)) {
            return cache.get(guess);
        }

        try {
            String url = "https://libretranslate.com/translate";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            String body = "q=" + guess + "&source=ur&target=en&format=text";
            HttpEntity<String> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
            String translated = (String) response.getBody().get("translatedText");

            // ✅ Word is valid if LibreTranslate returns a non-empty, different translation
            boolean isValid = translated != null &&
                    !translated.trim().isEmpty() &&
                    !translated.trim().equalsIgnoreCase(guess.trim());

            cache.put(guess, isValid);
            return isValid;
        } catch (Exception e) {
            System.err.println("❌ LibreTranslate error: " + e.getMessage());
            return false;
        }
    }
}
