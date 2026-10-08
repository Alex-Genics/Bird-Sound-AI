## 📖 Overview

Wildlife researchers, eco-tourists, and citizen scientists often work in remote, off-grid locations where cellular service is non-existent. Traditional audio-identification tools fail without an active internet connection.

**BirdVoice AI** is an offline-first browser extension that captures ambient audio, processes it locally using the Web Audio API, and identifies bird species without ever needing to connect to the cloud.

## ✨ Key Features

* 🔌 **100% Offline Capability:** Operates entirely locally. No internet connection or cloud API keys required.

* ⚡ **Zero Latency:** Edge-processed matching against a local dataset provides instant results.

* 🔒 **Privacy First:** Audio is processed inside your browser and never leaves your device.

* 🪶 **Lightweight Architecture:** Inspired by IEEE research on edge computing, optimized to run without draining laptop batteries in the field.

## 🛠️ Tech Stack

* **Architecture:** Chrome Extensions API (Manifest V3)

* **Audio Engine:** Vanilla JavaScript & Native Web Audio/MediaDevices API

* **Database:** Local JSON heuristic mapping

* **Styling:** HTML5 & Tailwind CSS / Custom CSS

## 🚀 Installation Instructions (Developer Mode)

To test this prototype locally on your machine, follow these steps:

1. **Clone the repository:**

   ```
   https://github.com/Alex-Genics/Bird-Sound-AI
   ```

2. **Open Chrome Extensions:** Open Google Chrome and navigate to `chrome://extensions/` in your address bar.

3. **Enable Developer Mode:** Toggle the **Developer mode** switch in the top right corner.

4. **Load the Extension:** Click the **Load unpacked** button in the top left corner.

5. **Select the Directory:** Choose the cloned `birdvoice-ai` folder on your computer.

6. 🎉 *Success!* The BirdVoice AI icon will now appear in your Chrome toolbar.

## 🎯 How to Use

1. Pin the BirdVoice AI extension to your Chrome toolbar for easy access.

2. Click the extension icon to open the popup.

3. Click the **"Listen for Birds"** button.

4. Grant the browser permission to use your microphone (first-time use only).

5. The extension will capture ambient audio, process the frequencies locally, and return a match from the offline database along with species details.

## 🔮 Future Roadmap

* \[ \] **Edge ML Integration:** Upgrading the local JSON matching engine to a lightweight **TensorFlow Lite** model for higher accuracy without sacrificing offline capabilities.

* \[ \] **Bluetooth Peer-to-Peer:** Allowing researchers to sync identified species logs locally with nearby team members without Wi-Fi.

* \[ \] **Expanded Database:** Adding offline support for over 500 regional bird species.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome during and after the hackathon! Feel free to check the [issues page](https://github.com/yourusername/birdvoice-ai/issues).

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
