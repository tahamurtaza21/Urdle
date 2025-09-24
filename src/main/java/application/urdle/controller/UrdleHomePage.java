package application.urdle.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class UrdleHomePage {

    @GetMapping("/")
    public String getHomePage(){
        return "index";
    }
}
