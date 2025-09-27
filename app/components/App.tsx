"use client";

import { useEffect, useRef, useState } from "react";
import {
  LiveConnectionState,
  LiveTranscriptionEvent,
  LiveTranscriptionEvents,
  useDeepgram,
} from "../context/DeepgramContextProvider";
import {
  MicrophoneEvents,
  MicrophoneState,
  useMicrophone,
} from "../context/MicrophoneContextProvider";
import Visualizer from "./Visualizer";
import { MicrophoneIcon } from "./icons/MicrophoneIcon";

const App: () => JSX.Element = () => {
  const [caption, setCaption] = useState<string | undefined>(
    "Powered by Deepgram"
  );
  const { connection, connectToDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, stopMicrophone, microphoneState } =
    useMicrophone();
  const captionTimeout = useRef<any>();
  const keepAliveInterval = useRef<any>();

  const toggleMicrophone = () => {
    if (microphoneState === MicrophoneState.Open) {
      stopMicrophone();
    } else if (microphoneState === MicrophoneState.Paused || microphoneState === MicrophoneState.Ready) {
      startMicrophone();
    }
  };

  const isMicrophoneActive = microphoneState === MicrophoneState.Open;

  useEffect(() => {
    setupMicrophone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (microphoneState === MicrophoneState.Ready) {
      connectToDeepgram({
        model: "nova-3",
        interim_results: true,
        smart_format: true,
        filler_words: true,
        utterance_end_ms: 3000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphoneState]);

  useEffect(() => {
    if (!microphone) return;
    if (!connection) return;

    const onData = (e: BlobEvent) => {
      // iOS SAFARI FIX:
      // Prevent packetZero from being sent. If sent at size 0, the connection will close. 
      if (e.data.size > 0) {
        connection?.send(e.data);
      }
    };

    const onTranscript = (data: LiveTranscriptionEvent) => {
      const { is_final: isFinal, speech_final: speechFinal } = data;
      let thisCaption = data.channel.alternatives[0].transcript;

      console.log("thisCaption", thisCaption);
      if (thisCaption !== "") {
        console.log('thisCaption !== ""', thisCaption);
        setCaption(thisCaption);
      }

      if (isFinal && speechFinal) {
        clearTimeout(captionTimeout.current);
        captionTimeout.current = setTimeout(() => {
          setCaption(undefined);
          clearTimeout(captionTimeout.current);
        }, 3000);
      }
    };

    if (connectionState === LiveConnectionState.OPEN) {
      connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);

      startMicrophone();
    }

    return () => {
      // prettier-ignore
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
      clearTimeout(captionTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState]);

  useEffect(() => {
    if (!connection) return;

    if (
      microphoneState !== MicrophoneState.Open &&
      connectionState === LiveConnectionState.OPEN
    ) {
      connection.keepAlive();

      keepAliveInterval.current = setInterval(() => {
        connection.keepAlive();
      }, 10000);
    } else {
      clearInterval(keepAliveInterval.current);
    }

    return () => {
      clearInterval(keepAliveInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphoneState, connectionState]);

  return (
    <>
      <div className="flex h-full antialiased">
        <div className="flex flex-row h-full w-full overflow-x-hidden">
          <div className="flex flex-col flex-auto h-full">
            <div className="relative w-full h-full">
              {microphone && isMicrophoneActive && <Visualizer microphone={microphone} />}
              <div className="absolute bottom-[12rem] inset-x-0 max-w-4xl mx-auto text-center">
                {caption && <span className="bg-black/70 p-8">{caption}</span>}
              </div>
              {/* Toggle Microphone Button */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                <div className="relative">
                  {/* Pulsing ring animation when active */}
                  {isMicrophoneActive && (
                    <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping"></div>
                  )}
                  {/* Outer glow ring */}
                  <div className={`
                    absolute inset-0 rounded-full transition-all duration-300
                    ${isMicrophoneActive
                      ? 'bg-red-500/20 scale-110'
                      : 'bg-gray-500/10 scale-100'
                    }
                  `}></div>

                  <button
                    onClick={toggleMicrophone}
                    disabled={microphoneState === MicrophoneState.SettingUp || microphoneState === MicrophoneState.Error}
                    className={`
                      relative p-6 rounded-full transition-all duration-300 ease-out backdrop-blur-sm border-2
                      ${isMicrophoneActive
                        ? 'bg-gradient-to-br from-red-500 to-red-600 border-red-400/50 shadow-2xl shadow-red-500/40'
                        : 'bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600/50 shadow-xl shadow-gray-800/30'
                      }
                      ${microphoneState === MicrophoneState.SettingUp || microphoneState === MicrophoneState.Error
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:scale-110 active:scale-95 hover:shadow-2xl'
                      }
                      ${isMicrophoneActive ? 'hover:from-red-400 hover:to-red-500' : 'hover:from-gray-600 hover:to-gray-700'}
                    `}
                    aria-label={isMicrophoneActive ? "Mute microphone" : "Unmute microphone"}
                  >
                    <MicrophoneIcon
                      micOpen={isMicrophoneActive}
                      className={`
                        w-8 h-8 transition-all duration-200
                        ${isMicrophoneActive
                          ? 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]'
                          : 'text-white drop-shadow-md'
                        }
                      `}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default App;
