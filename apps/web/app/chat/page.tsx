"use client";
import { getThemeToggler } from "../lib/get-theme-button";
import { useEffect, useState } from "react";

interface WSMessage {
  room_id: number;
  message: string;
}

export default function Page() {
  const SetThemeButton = getThemeToggler();

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [message, setMessage] = useState<string>("");

  console.log("messages")
  console.log(messages)


  useEffect(() => {
    if (socket) {
      console.log("SETTING EVENT LISTENER")

      socket.onmessage = (event) => {
        console.log("RECEIVED A MESSAGE")
        const messageData: WSMessage = JSON.parse(event.data);
        const message = messageData.message;
        setMessages((prevMessages) => [...prevMessages, message]);
      };
    }
  }, [socket]);


  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/chatroom');
    
    ws.onopen = () => {
      console.log('WebSocket connection established');
      setSocket(ws);
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);


  return (
    <main className="flex flex-col items-center justify-start min-h-screen pt-8 px-4">
      <div className="flex max-w-2xl justify-between w-full items-center">
        <SetThemeButton />
        
      </div>
      <div className="flex items-center justify-center text-2xl py-4">
          <h1>
            Is it Chill Tonight?  
          </h1>
      </div>
      <div className="max-w-2xl text-start w-full mt-8">
        <div className="border border-gray-300 rounded-lg p-4 h-[400px] overflow-y-auto mb-4 flex flex-col">
          {messages.map((msg, index) => (
            <div key={index} className="mb-2 text-white">
              {msg}
            </div>
          ))}
        </div>
        <div className="flex">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-grow border border-gray-300 rounded-l-lg p-2 text-black"
            placeholder="Type your message..."
          />
          <button 
            className="bg-blue-500 text-white px-4 py-2 rounded-r-lg"
            onClick={() => {
              if (socket && message.trim()) {
                console.log(`Sending ${message}`)
                socket.send(message);
                setMessage('');
                setMessages((messages) => [...messages, message])
              }
            }}
          >
            Send
          </button>
        </div>
      </div>
      <div></div>
    </main>
  );
}

