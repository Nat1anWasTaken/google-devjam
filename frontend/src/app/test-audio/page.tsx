"use client";

import React from "react";
import AudioPlayer from "@/components/audio-player";

export default function TestAudioPage() {
  // Sample audio URLs for testing auto-detection
  const testAudios = [
    {
      id: "test-1",
      title: "MP3 Audio (Auto-detect from extension)",
      url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3",
      description: "Should auto-detect as audio/mpeg",
    },
    {
      id: "test-2",
      title: "OGG Audio (Auto-detect from extension)",
      url: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg",
      description: "Should auto-detect as audio/ogg",
    },
    {
      id: "test-3",
      title: "WAV Audio (Auto-detect from extension)",
      url: "https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav",
      description: "Should auto-detect as audio/wav",
    },
    {
      id: "test-4",
      title: "Invalid URL (Error handling test)",
      url: "https://invalid-url-that-does-not-exist.com/audio.mp3",
      description: "Should show error with retry option",
    },
    {
      id: "test-5",
      title: "URL without extension (Pattern detection)",
      url: "https://example.com/api/audio?format=mp3&id=123",
      description: "Should auto-detect from query parameters",
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Audio Player Test Page</h1>
        <p className="text-muted-foreground">
          Test the audio player component with different audio sources
        </p>
      </div>

      <div className="space-y-6">
        {testAudios.map((audio) => (
          <div key={audio.id} className="space-y-2">
            <h2 className="text-lg font-semibold">{audio.title}</h2>
            <p className="text-sm text-muted-foreground">URL: {audio.url}</p>
            <AudioPlayer
              audioUrl={audio.url}
              newsId={audio.id}
              className="max-w-md"
            />
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 border rounded-lg bg-muted/20">
        <h3 className="font-semibold mb-2">Auto-Detection Testing:</h3>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>• MP3: Auto-detects from .mp3 extension → audio/mpeg</li>
          <li>• OGG: Auto-detects from .ogg extension → audio/ogg</li>
          <li>• WAV: Auto-detects from .wav extension → audio/wav</li>
          <li>• Invalid URL: Tests comprehensive error handling</li>
          <li>• Query Parameters: Auto-detects from ?format=mp3</li>
          <li>• Check browser dev tools to see detected content types</li>
          <li>• Each audio player has independent caching and state</li>
        </ul>
      </div>
    </div>
  );
}
