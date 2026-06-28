package com.garagefinder.controller;

import com.garagefinder.model.*;
import com.garagefinder.repository.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Value;

import java.util.*;

@RestController
@RequestMapping("/api/chatbot")
public class ChatbotController {

    private final GarageRepository garageRepository;
    private final OfferedServiceRepository offeredServiceRepository;
    private final SparePartShopRepository sparePartShopRepository;
    private final SparePartRepository sparePartRepository;
    private final ReviewRepository reviewRepository;
    private final ShopReviewRepository shopReviewRepository;

    @Value("${gemini.api.key:}")
    private String apiKeyFromConfig;

    public ChatbotController(
            GarageRepository garageRepository,
            OfferedServiceRepository offeredServiceRepository,
            SparePartShopRepository sparePartShopRepository,
            SparePartRepository sparePartRepository,
            ReviewRepository reviewRepository,
            ShopReviewRepository shopReviewRepository) {
        this.garageRepository = garageRepository;
        this.offeredServiceRepository = offeredServiceRepository;
        this.sparePartShopRepository = sparePartShopRepository;
        this.sparePartRepository = sparePartRepository;
        this.reviewRepository = reviewRepository;
        this.shopReviewRepository = shopReviewRepository;
    }

    @PostMapping("/chat")
    public ResponseEntity<?> getChatResponse(@RequestBody ChatRequest chatRequest) {
        if (chatRequest.getMessage() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Message is required"));
        }

        try {
            // Build the prompt containing instruction, context, conversation history, and
            // the new query
            String systemInstruction = "You are the GarageLK AI Assistant, a friendly and expert customer service helper for the GarageLK platform in Sri Lanka. "
                    +
                    "Your job is to assist users in finding suitable garages, offered services, pricing, and spare parts. "
                    +
                    "You must answer in the user's preferred language (English or Sinhala), using a professional and helpful tone. "
                    +
                    "Focus on recommending services, garages, or shops present in our context. If the user asks about a location or service not present, tell them politely that we only have the listed garages/shops, but offer standard advice.\n\n";

            StringBuilder promptBuilder = new StringBuilder();
            promptBuilder.append(systemInstruction);
            promptBuilder.append("=== VERIFIED DATABASE CONTEXT ===\n");

            // Filter context based on user selection to optimize prompt size and RAG
            // accuracy
            boolean filterGarage = "garage".equalsIgnoreCase(chatRequest.getSearchType());
            boolean filterParts = "parts".equalsIgnoreCase(chatRequest.getSearchType());
            String dst = chatRequest.getDistrict();

            // Append Garages Context
            if (filterGarage || (!filterGarage && !filterParts)) {
                promptBuilder.append("--- GARAGES ---\n");
                List<Garage> garages = new ArrayList<>();
                if (dst != null && !dst.trim().isEmpty()) {
                    List<Garage> allGarages = garageRepository.findByStatus("APPROVED");
                    for (Garage g : allGarages) {
                        if (g.getCity().equalsIgnoreCase(dst.trim()) || g.getDistrict().equalsIgnoreCase(dst.trim())) {
                            garages.add(g);
                        }
                    }
                } else {
                    garages = garageRepository.findByStatus("APPROVED");
                }

                for (Garage g : garages) {
                    Double avgRating = reviewRepository.findAverageRatingByGarageId(g.getId());
                    promptBuilder.append(String.format(
                            "Garage ID: %d, Name: %s, Owner: %s, City: %s, District: %s, Phone: %s, Email: %s, Rating: %.1f\n",
                            g.getId(), g.getGarageName(), g.getOwnerName(), g.getCity(), g.getDistrict(), g.getPhone(),
                            g.getEmail(),
                            avgRating != null ? avgRating : 0.0));
                    promptBuilder.append(String.format("  Address: %s\n", g.getAddress()));
                    promptBuilder.append(String.format("  Description: %s\n", g.getDescription()));
                    promptBuilder.append(String.format("  Vehicle Types Supported: %s\n",
                            g.getVehicleTypes() != null ? g.getVehicleTypes() : "Car,Van"));
                    promptBuilder.append(String.format("  Engine Types Supported: %s\n",
                            g.getEngineTypes() != null ? g.getEngineTypes() : "Petrol,Diesel"));
                    promptBuilder.append("  Services Offered:\n");
                    List<OfferedService> services = offeredServiceRepository.findByGarageId(g.getId());
                    if (services != null && !services.isEmpty()) {
                        for (OfferedService os : services) {
                            promptBuilder.append(String.format("    * %s: LKR %,.2f (%s)\n", os.getServiceType(),
                                    os.getPrice(), os.getDescription()));
                        }
                    } else {
                        promptBuilder.append("    * No specific services listed yet.\n");
                    }
                    promptBuilder.append("\n");
                }
            }

            // Append Spare Part Shops Context
            if (filterParts || (!filterGarage && !filterParts)) {
                promptBuilder.append("--- SPARE PART SHOPS ---\n");
                List<SparePartShop> shops = new ArrayList<>();
                List<SparePartShop> allShops = sparePartShopRepository.findByStatus("APPROVED");
                if (dst != null && !dst.trim().isEmpty()) {
                    for (SparePartShop s : allShops) {
                        if (s.getCity().equalsIgnoreCase(dst.trim()) || s.getDistrict().equalsIgnoreCase(dst.trim())) {
                            shops.add(s);
                        }
                    }
                } else {
                    shops = allShops;
                }

                for (SparePartShop s : shops) {
                    promptBuilder.append(String.format(
                            "Shop ID: %d, Name: %s, Owner: %s, City: %s, District: %s, Phone: %s, Email: %s\n",
                            s.getId(), s.getShopName(), s.getOwnerName(), s.getCity(), s.getDistrict(), s.getPhone(),
                            s.getEmail()));
                    promptBuilder.append(String.format("  Address: %s\n", s.getAddress()));
                    promptBuilder.append(String.format("  Description: %s\n", s.getDescription()));
                    promptBuilder.append("  Spare Parts in Stock:\n");
                    List<SparePart> parts = sparePartRepository.findByShopId(s.getId());
                    if (parts != null && !parts.isEmpty()) {
                        for (SparePart sp : parts) {
                            promptBuilder
                                    .append(String.format("    * %s (Compatibility: %s %d): LKR %,.2f (Stock: %d)\n",
                                            sp.getPartName(), sp.getVehicleModel(), sp.getVehicleYear(), sp.getPrice(),
                                            sp.getQuantity()));
                        }
                    } else {
                        promptBuilder.append("    * No parts listed in stock yet.\n");
                    }
                    promptBuilder.append("\n");
                }
            }

            // Append conversation history
            if (chatRequest.getHistory() != null && !chatRequest.getHistory().isEmpty()) {
                promptBuilder.append("=== CONVERSATION HISTORY ===\n");
                for (ChatMessage msg : chatRequest.getHistory()) {
                    String sender = "user".equalsIgnoreCase(msg.getRole()) ? "Customer" : "Assistant";
                    promptBuilder.append(sender).append(": ").append(msg.getContent()).append("\n");
                }
                promptBuilder.append("\n");
            }

            // Append new query
            if ("parts".equalsIgnoreCase(chatRequest.getSearchType()) && chatRequest.getPartName() != null
                    && !chatRequest.getPartName().trim().isEmpty()) {
                promptBuilder.append(String.format(
                        "(Context: Searching for spare part Name: '%s', Model: '%s', Year: '%s' in district '%s')\n",
                        chatRequest.getPartName(),
                        chatRequest.getPartModel() != null ? chatRequest.getPartModel() : "",
                        chatRequest.getPartYear() != null ? chatRequest.getPartYear() : "",
                        chatRequest.getDistrict() != null ? chatRequest.getDistrict() : ""));
            }
            promptBuilder.append("Customer: ").append(chatRequest.getMessage()).append("\n");
            promptBuilder.append("Assistant: ");

            String finalPrompt = promptBuilder.toString();

            // Try to call Gemini API if key is configured
            String apiKey = apiKeyFromConfig;
            if (apiKey == null || apiKey.trim().isEmpty()) {
                apiKey = System.getenv("GEMINI_API_KEY");
            }
            if (apiKey == null || apiKey.trim().isEmpty()) {
                apiKey = System.getProperty("GEMINI_API_KEY");
            }

            if (apiKey != null && !apiKey.trim().isEmpty()) {
                try {
                    String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key="
                            + apiKey.trim();
                    RestTemplate restTemplate = new RestTemplate();

                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.APPLICATION_JSON);

                    Map<String, Object> textMap = Map.of("text", finalPrompt);
                    Map<String, Object> partMap = Map.of("parts", List.of(textMap));
                    Map<String, Object> contentMap = Map.of("contents", List.of(partMap));

                    HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(contentMap, headers);
                    ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);

                    if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                        String reply = parseGeminiResponse(response.getBody());
                        if (reply != null && !reply.trim().isEmpty()) {
                            return ResponseEntity.ok(Map.of("reply", reply.trim()));
                        }
                    }
                } catch (Exception ex) {
                    System.err.println("Gemini API request failed, falling back to rule-based assistant. Error: "
                            + ex.getMessage());
                }
            }

            // Rule-based fallback if Gemini API key is missing or failed
            Map<String, Object> replyMap = getFallbackResponse(chatRequest);
            return ResponseEntity.ok(replyMap);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error processing chatbot request: " + e.getMessage()));
        }
    }

    private String parseGeminiResponse(String responseJson) {
        if (responseJson == null)
            return null;

        int textIndex = responseJson.indexOf("\"text\":");
        if (textIndex == -1)
            return null;

        int startQuote = responseJson.indexOf("\"", textIndex + 7);
        if (startQuote == -1)
            return null;

        StringBuilder sb = new StringBuilder();
        boolean escaped = false;
        for (int i = startQuote + 1; i < responseJson.length(); i++) {
            char c = responseJson.charAt(i);
            if (escaped) {
                if (c == 'n')
                    sb.append('\n');
                else if (c == 't')
                    sb.append('\t');
                else if (c == 'r')
                    sb.append('\r');
                else if (c == '\\')
                    sb.append('\\');
                else if (c == '"')
                    sb.append('"');
                else
                    sb.append(c);
                escaped = false;
            } else if (c == '\\') {
                escaped = true;
            } else if (c == '"') {
                break; // End of string
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    private Map<String, Object> getFallbackResponse(ChatRequest request) {
        Map<String, Object> res = new HashMap<>();
        String message = request.getMessage();
        String searchType = request.getSearchType();
        String district = request.getDistrict();
        String msgLower = message != null ? message.toLowerCase().trim() : "";
        String dstLower = district != null ? district.toLowerCase().trim() : "";
        String partName = request.getPartName();
        String partModel = request.getPartModel();
        String partYear = request.getPartYear();

        // Check if greeting
        if (msgLower.matches(
                ".*\\b(hello|hi|hey|heyy|greeting|good morning|good afternoon|good evening|wassup|yo|hello chatbot|halo)\\b.*")) {
            res.put("reply", "Hello! I am your GarageLK Assistant. How can I help you today?");
            return res;
        }

        boolean isGarage = "garage".equalsIgnoreCase(searchType);

        // Retrieve approved garages & shops
        List<Garage> allGarages = garageRepository.findByStatus("APPROVED");
        List<SparePartShop> allShops = sparePartShopRepository.findByStatus("APPROVED");

        // Filter by district/city
        List<Garage> filteredGarages = new ArrayList<>();
        for (Garage g : allGarages) {
            if (!dstLower.isEmpty()) {
                if (g.getDistrict().equalsIgnoreCase(dstLower) || g.getCity().equalsIgnoreCase(dstLower) ||
                        g.getDistrict().toLowerCase().contains(dstLower)
                        || g.getCity().toLowerCase().contains(dstLower)) {
                    filteredGarages.add(g);
                }
            } else {
                filteredGarages.add(g);
            }
        }

        List<SparePartShop> filteredShops = new ArrayList<>();
        for (SparePartShop s : allShops) {
            if (!dstLower.isEmpty()) {
                if (s.getDistrict().equalsIgnoreCase(dstLower) || s.getCity().equalsIgnoreCase(dstLower) ||
                        s.getDistrict().toLowerCase().contains(dstLower)
                        || s.getCity().toLowerCase().contains(dstLower)) {
                    filteredShops.add(s);
                }
            } else {
                filteredShops.add(s);
            }
        }

        // Determine if this is a general list/find request
        boolean isGeneralList = msgLower.isEmpty() ||
                msgLower.contains("show me") ||
                msgLower.contains("find") ||
                msgLower.contains("list") ||
                msgLower.contains("search") ||
                msgLower.contains(dstLower);

        if (partName != null && !partName.trim().isEmpty()) {
            isGeneralList = false;
        }

        if (isGeneralList) {
            if (isGarage) {
                if (filteredGarages.isEmpty()) {
                    // Build distinct districts of approved garages
                    Set<String> districts = new TreeSet<>();
                    for (Garage g : allGarages) {
                        if (g.getDistrict() != null && !g.getDistrict().isEmpty()) {
                            districts.add(g.getDistrict());
                        }
                    }
                    String available = String.join(", ", districts);
                    res.put("reply", "I couldn't find any approved garages in '" + district + "' in my database." +
                            (!available.isEmpty() ? " Currently, we have verified garages in: **" + available + "**."
                                    : " No verified garages are registered yet."));
                    return res;
                }

                res.put("reply", "I found **" + filteredGarages.size() + " verified "
                        + (filteredGarages.size() == 1 ? "garage" : "garages") + "** in " + district + ":");

                List<Map<String, Object>> providersList = new ArrayList<>();
                for (Garage g : filteredGarages) {
                    Map<String, Object> p = new HashMap<>();
                    p.put("id", g.getId());
                    p.put("type", "garage");
                    p.put("name", g.getGarageName());
                    p.put("city", g.getCity());
                    p.put("address", g.getAddress());
                    p.put("latitude", g.getLatitude());
                    p.put("longitude", g.getLongitude());
                    p.put("description", g.getDescription() != null ? g.getDescription() : "Full service auto repair.");
                    p.put("phone", g.getPhone() != null ? g.getPhone() : "N/A");
                    Double avgRating = reviewRepository.findAverageRatingByGarageId(g.getId());
                    p.put("rating", (avgRating != null && avgRating > 0) ? String.format("%.1f", avgRating) : null);

                    // List services
                    List<OfferedService> services = offeredServiceRepository.findByGarageId(g.getId());
                    List<String> serviceNames = new ArrayList<>();
                    if (services != null) {
                        for (OfferedService os : services) {
                            serviceNames.add(os.getServiceType());
                        }
                    }
                    p.put("items", serviceNames);
                    providersList.add(p);
                }
                res.put("providers", providersList);
                return res;
            } else {
                // Spare part shops
                if (filteredShops.isEmpty()) {
                    // Build distinct districts of approved shops
                    Set<String> districts = new TreeSet<>();
                    for (SparePartShop s : allShops) {
                        if (s.getDistrict() != null && !s.getDistrict().isEmpty()) {
                            districts.add(s.getDistrict());
                        }
                    }
                    String available = String.join(", ", districts);
                    res.put("reply",
                            "I couldn't find any approved spare part shops in '" + district + "' in my database." +
                                    (!available.isEmpty()
                                            ? " Currently, we have verified spare part shops in: **" + available + "**."
                                            : " No verified spare part shops are registered yet."));
                    return res;
                }

                res.put("reply",
                        "I found **" + filteredShops.size() + " verified "
                                + (filteredShops.size() == 1 ? "spare parts shop" : "spare parts shops") + "** in "
                                + district + ":");

                List<Map<String, Object>> providersList = new ArrayList<>();
                for (SparePartShop s : filteredShops) {
                    Map<String, Object> p = new HashMap<>();
                    p.put("id", s.getId());
                    p.put("type", "shop");
                    p.put("name", s.getShopName());
                    p.put("city", s.getCity());
                    p.put("address", s.getAddress());
                    p.put("latitude", s.getLatitude());
                    p.put("longitude", s.getLongitude());
                    p.put("description",
                            s.getDescription() != null ? s.getDescription() : "Quality auto spare parts dealer.");
                    p.put("phone", s.getPhone() != null ? s.getPhone() : "N/A");
                    Double avgRating = shopReviewRepository.findAverageRatingByShopId(s.getId());
                    p.put("rating", (avgRating != null && avgRating > 0) ? String.format("%.1f", avgRating) : null);

                    // List parts
                    List<SparePart> parts = sparePartRepository.findByShopId(s.getId());
                    List<String> partNames = new ArrayList<>();
                    if (parts != null) {
                        for (SparePart sp : parts) {
                            partNames.add(sp.getPartName());
                        }
                    }
                    p.put("items", partNames);
                    providersList.add(p);
                }
                res.put("providers", providersList);
                return res;
            }
        }

        // Specific service/part queries
        if (isGarage) {
            List<Map<String, Object>> providersList = new ArrayList<>();
            for (Garage g : filteredGarages) {
                List<OfferedService> services = offeredServiceRepository.findByGarageId(g.getId());
                if (services != null) {
                    List<String> matchedServices = new ArrayList<>();
                    for (OfferedService os : services) {
                        if (os.getServiceType().toLowerCase().contains(msgLower) ||
                                (os.getDescription() != null && os.getDescription().toLowerCase().contains(msgLower))) {
                            matchedServices.add(String.format("%s (LKR %,.2f)", os.getServiceType(), os.getPrice()));
                        }
                    }
                    if (!matchedServices.isEmpty()) {
                        Map<String, Object> p = new HashMap<>();
                        p.put("id", g.getId());
                        p.put("type", "garage");
                        p.put("name", g.getGarageName());
                        p.put("city", g.getCity());
                        p.put("address", g.getAddress());
                        p.put("latitude", g.getLatitude());
                        p.put("longitude", g.getLongitude());
                        p.put("description",
                                g.getDescription() != null ? g.getDescription() : "Full service auto repair.");
                        p.put("phone", g.getPhone() != null ? g.getPhone() : "N/A");
                        Double avgRating = reviewRepository.findAverageRatingByGarageId(g.getId());
                        p.put("rating", (avgRating != null && avgRating > 0) ? String.format("%.1f", avgRating) : null);
                        p.put("items", matchedServices);
                        p.put("label", "Matching Services");
                        providersList.add(p);
                    }
                }
            }

            if (!providersList.isEmpty()) {
                res.put("reply", "Here are the services matching '**" + message + "**' in " + district + ":");
                res.put("providers", providersList);
            } else {
                StringBuilder sb = new StringBuilder();
                sb.append("I couldn't find a service matching '**").append(message).append("**' offered by garages in ")
                        .append(district).append(".\n\n");
                if (!filteredGarages.isEmpty()) {
                    sb.append("Here are the verified garages in this area you can contact directly:\n");
                    for (Garage g : filteredGarages) {
                        sb.append("- **").append(g.getGarageName()).append("** (📞 ")
                                .append(g.getPhone() != null ? g.getPhone() : "N/A").append(")\n");
                    }
                }
                res.put("reply", sb.toString());
            }
            return res;
        } else {
            // Spare parts
            List<Map<String, Object>> providersList = new ArrayList<>();
            for (SparePartShop s : filteredShops) {
                List<SparePart> parts = sparePartRepository.findByShopId(s.getId());
                if (parts != null) {
                    List<String> matchedParts = new ArrayList<>();
                    for (SparePart sp : parts) {
                        boolean matches = false;
                        if (partName != null && !partName.trim().isEmpty()) {
                            boolean nameMatches = sp.getPartName().toLowerCase()
                                    .contains(partName.toLowerCase().trim());
                            boolean modelMatches = true;
                            if (partModel != null && !partModel.trim().isEmpty()) {
                                modelMatches = sp.getVehicleModel() != null
                                        && sp.getVehicleModel().toLowerCase().contains(partModel.toLowerCase().trim());
                            }
                            boolean yearMatches = true;
                            if (partYear != null && !partYear.trim().isEmpty()) {
                                yearMatches = sp.getVehicleYear() != null
                                        && String.valueOf(sp.getVehicleYear()).contains(partYear.trim());
                            }
                            matches = nameMatches && modelMatches && yearMatches;
                        } else {
                            matches = sp.getPartName().toLowerCase().contains(msgLower) ||
                                    (sp.getVehicleModel() != null
                                            && sp.getVehicleModel().toLowerCase().contains(msgLower));
                        }

                        if (matches) {
                            matchedParts.add(String.format("%s for %s (%d) - LKR %,.2f (%d in stock)",
                                    sp.getPartName(), sp.getVehicleModel(), sp.getVehicleYear(), sp.getPrice(),
                                    sp.getQuantity()));
                        }
                    }
                    if (!matchedParts.isEmpty()) {
                        Map<String, Object> p = new HashMap<>();
                        p.put("id", s.getId());
                        p.put("type", "shop");
                        p.put("name", s.getShopName());
                        p.put("city", s.getCity());
                        p.put("address", s.getAddress());
                        p.put("latitude", s.getLatitude());
                        p.put("longitude", s.getLongitude());
                        p.put("description",
                                s.getDescription() != null ? s.getDescription() : "Quality auto spare parts dealer.");
                        p.put("phone", s.getPhone() != null ? s.getPhone() : "N/A");
                        Double avgRating = shopReviewRepository.findAverageRatingByShopId(s.getId());
                        p.put("rating", (avgRating != null && avgRating > 0) ? String.format("%.1f", avgRating) : null);
                        p.put("items", matchedParts);
                        p.put("label", "Matching Parts");
                        providersList.add(p);
                    }
                }
            }

            if (!providersList.isEmpty()) {
                String searchSummary = "";
                if (partName != null && !partName.trim().isEmpty()) {
                    searchSummary = partName.trim();
                    if (partModel != null && !partModel.trim().isEmpty()) {
                        searchSummary += " for " + partModel.trim();
                    }
                    if (partYear != null && !partYear.trim().isEmpty()) {
                        searchSummary += " (" + partYear.trim() + ")";
                    }
                } else {
                    searchSummary = message;
                }
                res.put("reply", "Here are the spare parts matching '**" + searchSummary + "**' in " + district + ":");
                res.put("providers", providersList);
            } else {
                String searchSummary = "";
                if (partName != null && !partName.trim().isEmpty()) {
                    searchSummary = partName.trim();
                    if (partModel != null && !partModel.trim().isEmpty()) {
                        searchSummary += " for " + partModel.trim();
                    }
                    if (partYear != null && !partYear.trim().isEmpty()) {
                        searchSummary += " (" + partYear.trim() + ")";
                    }
                } else {
                    searchSummary = message;
                }
                StringBuilder sb = new StringBuilder();
                sb.append("I couldn't find any spare parts matching '**").append(searchSummary)
                        .append("**' in stock in ").append(district).append(".");
                res.put("reply", sb.toString());
            }
            return res;
        }
    }

    // DTO Classes
    public static class ChatRequest {
        private String message;
        private List<ChatMessage> history;
        private String searchType;
        private String district;

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }

        public List<ChatMessage> getHistory() {
            return history;
        }

        public void setHistory(List<ChatMessage> history) {
            this.history = history;
        }

        public String getSearchType() {
            return searchType;
        }

        public void setSearchType(String searchType) {
            this.searchType = searchType;
        }

        public String getDistrict() {
            return district;
        }

        public void setDistrict(String district) {
            this.district = district;
        }

        private String partName;
        private String partModel;
        private String partYear;

        public String getPartName() {
            return partName;
        }

        public void setPartName(String partName) {
            this.partName = partName;
        }

        public String getPartModel() {
            return partModel;
        }

        public void setPartModel(String partModel) {
            this.partModel = partModel;
        }

        public String getPartYear() {
            return partYear;
        }

        public void setPartYear(String partYear) {
            this.partYear = partYear;
        }
    }

    public static class ChatMessage {
        private String role;
        private String content;

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }
    }
}
