// src/LiveTyper.tsx

import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

function LiveTyper() {
  // State for the text you are typing
  const [myInput, setMyInput] = useState('');
  // State for the text received from other users
  const [liveText, setLiveText] = useState('');

  // Use a ref to hold the channel instance.
  // This is important so the same channel instance can be used in the effect and in the handler.
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // 1. Create a channel for broadcasting
    const channel = supabase.channel('live-typer-channel', {
      config: {
        broadcast: {
          self: true, // Set to true if you want to receive your own messages
        },
      },
    });

    // 2. Set up a listener for 'typing' events on the channel
    channel.on('broadcast', { event: 'typing' }, (payload) => {
      // When a message is received, update the liveText state
      setLiveText(payload.payload.message);
    });

    // 3. Subscribe to the channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Connected to live-typer channel!');
        // Store the channel instance in the ref once subscribed
        channelRef.current = channel;
      }
    });

    // 4. Cleanup function to unsubscribe when the component unmounts
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []); // The empty array ensures this effect runs only once

  // This function is called every time you type in the input box
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const message = e.target.value;
    setMyInput(message);

    // Send the message through the broadcast channel
    if (channelRef.current?.state === 'joined') {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { message: message },
      });
    }
  };

  return (
    <div className="live-typer-container">
      <h2>⌨️ Live Typer Test</h2>
      <p>Open this page in another tab to see it work!</p>

      <div className="input-section">
        <label>Your Input:</label>
        <input
          type="text"
          value={myInput}
          onChange={handleInputChange}
          placeholder="Type here..."
        />
      </div>

      <div className="display-section">
        <h3>Live Text from Everywhere:</h3>
        <div className="live-display">{liveText}</div>
      </div>
    </div>
  );
}

export default LiveTyper;