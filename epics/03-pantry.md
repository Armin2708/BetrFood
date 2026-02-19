# Epic 3: Pantry (Photo-Based Inventory Management)

## Overview

Build a pantry feature that allows users to manage a list of food items they currently have at home. The key differentiator is the ability to add items by taking a photo — the app recognizes ingredients from the image and adds them to the pantry. This connects to the AI chat and content suggestion systems to enable "cook with what you have" experiences.

## Architecture

- **Client**: iOS app (Swift, Xcode)
- **Backend**: Supabase (PostgreSQL)
- **Image Recognition**: On-device Vision framework (Apple) + fallback to AI model via OpenRouter for complex recognition
- **Camera**: AVFoundation / UIImagePickerController / PhotosUI

## User Stories

### Pantry Management

- **As a user**, I want to view my pantry as a list of items I currently have at home.
- **As a user**, I want to manually add an item to my pantry by typing its name and optional details (quantity, expiration date, category).
- **As a user**, I want to remove items from my pantry when I use them up.
- **As a user**, I want to edit item details (name, quantity, expiration).
- **As a user**, I want to see my pantry items organized by category (produce, dairy, proteins, grains, spices, canned goods, etc.).
- **As a user**, I want to search/filter my pantry items.

### Photo-Based Item Addition

- **As a user**, I want to take a photo of groceries/ingredients and have the app automatically identify the items so that I can quickly add them to my pantry.
- **As a user**, I want to take a photo of a single item for identification.
- **As a user**, I want to take a photo of multiple items (e.g., a grocery haul on the counter) and have the app identify all visible items.
- **As a user**, I want to review and confirm the identified items before they are added to my pantry (edit names, remove incorrect detections, add missed items).
- **As a user**, I want to take a photo of a receipt to extract purchased items.

### Pantry Insights

- **As a user**, I want to see items that are expiring soon so that I can use them before they go bad.
- **As a user**, I want to get notified when items are about to expire.
- **As a user**, I want to see a summary of what categories of food I have available.

### Integration Points

- **As a user**, I want to ask the AI chat "What can I cook with what's in my pantry?" and get suggestions based on my actual pantry items.
- **As a user**, I want to see recipe posts in my feed that I can make with my current pantry items (or with minimal extra ingredients).

## Data Model (Supabase/PostgreSQL)

### Tables

```
pantry_items
  - id (uuid, PK)
  - user_id (uuid, FK -> profiles)
  - name (text)
  - category (enum: produce, dairy, proteins, grains, spices, condiments, canned, frozen, beverages, snacks, other)
  - quantity (text, nullable)        -- "2 lbs", "1 bunch", "500ml"
  - unit (text, nullable)            -- for structured quantity
  - expiration_date (date, nullable)
  - added_via (enum: manual, photo, receipt)
  - photo_url (text, nullable)       -- source photo if added via photo
  - created_at (timestamptz)
  - updated_at (timestamptz)

pantry_photos
  - id (uuid, PK)
  - user_id (uuid, FK -> profiles)
  - photo_url (text)
  - detected_items (jsonb)  -- raw detection results
  - processed (boolean)
  - created_at (timestamptz)
```

## iOS Implementation Notes

### Photo Capture & Recognition Pipeline

```
1. User taps "Add by Photo" in Pantry
2. Camera opens (AVFoundation or UIImagePickerController)
3. User takes photo
4. Image processing pipeline:
   a. On-device: Apple Vision framework (VNRecognizeTextRequest for receipts,
      VNClassifyImageRequest for food items)
   b. If on-device confidence is low or for complex multi-item scenes:
      Send image to OpenRouter API with a prompt like:
      "Identify all food/grocery items visible in this image.
       Return a JSON array of {name, category, estimated_quantity}."
5. Display detected items in a review/confirm screen
6. User confirms, edits, or removes items
7. Confirmed items are saved to pantry_items table
```

### Key iOS Components

- **Camera View**: `UIImagePickerController` or custom AVFoundation camera for photo capture.
- **Image Analysis**: `Vision` framework for on-device text/object recognition.
- **OpenRouter Fallback**: HTTP request to OpenRouter API with base64-encoded image for AI-based recognition.
- **Review Screen**: SwiftUI list with editable item rows (name, category, quantity) and delete option.
- **Pantry List View**: SwiftUI `List` grouped by category with search bar.
- **Expiration Alerts**: Local notifications scheduled via `UNUserNotificationCenter`.

### OpenRouter Image Recognition

```swift
// Send image to OpenRouter for multi-item recognition
// Model: free ChatGPT model via OpenRouter
// Prompt: "Identify all food items in this photo. Return JSON array."
// Parse response and populate review screen
```

## Acceptance Criteria

- [ ] User can view their pantry as a categorized list
- [ ] User can manually add items with name, category, quantity, and expiration date
- [ ] User can edit and delete pantry items
- [ ] User can search and filter pantry items
- [ ] User can take a photo of a single item and have it identified
- [ ] User can take a photo of multiple items and have them all identified
- [ ] User can take a photo of a receipt and have items extracted
- [ ] Detected items are shown in a review screen before being added
- [ ] User can edit/remove detected items in the review screen
- [ ] On-device Vision framework is used as first pass for recognition
- [ ] OpenRouter AI model is used as fallback for complex recognition
- [ ] Items expiring within 3 days are highlighted
- [ ] Local notifications fire for expiring items
- [ ] Pantry data is available to AI chat for "what can I cook" queries
- [ ] Pantry items are synced to Supabase for cross-session persistence

## Dependencies

- Epic 2 (User Management) — requires authenticated users
- Epic 4 (AI Chat) — for "what can I cook" integration
- Epic 5 (Content Suggestion) — for pantry-based recipe suggestions
- OpenRouter API access for image recognition fallback
- Camera permissions (Info.plist: NSCameraUsageDescription)
- Notification permissions for expiration alerts
