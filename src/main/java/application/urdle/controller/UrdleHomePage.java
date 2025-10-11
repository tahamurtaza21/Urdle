package application.urdle.controller;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.Random;

@Controller
public class UrdleHomePage {

    private final JSONArray wordArray;

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
    public boolean checkWord(@RequestParam String guess) throws Exception {
        // Load your word list
        InputStream input = getClass().getResourceAsStream("/static/words/urdu_5_letter_words.json");
        JSONObject json = new JSONObject(new JSONTokener(input));
        JSONArray words = json.getJSONArray("words");

        // Normalize and compare
        for (int i = 0; i < words.length(); i++) {
            if (words.getString(i).equals(guess)) {
                return true;
            }
        }

        return false;
    }
}
