// src/App.tsx

import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import './App.css';

interface Option {
  id: number;
  name: string;
  votes: number;
}

function App() {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch the initial data
    const fetchOptions = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('options')
          .select('*')
          .order('votes', { ascending: false });

        if (error) throw error;
        if (data) setOptions(data);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();

    // 2. Subscribe to real-time updates
    const channel = supabase
      .channel('options-channel')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'options' },
        (payload) => {
          // When an update is received, update the state
          const updatedOption = payload.new as Option;
          setOptions(currentOptions =>
            currentOptions
              .map(option =>
                option.id === updatedOption.id ? updatedOption : option
              )
              .sort((a, b) => b.votes - a.votes) // Re-sort after update
          );
        }
      )
      .subscribe();

    // 3. Cleanup function to unsubscribe
    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleVote = async (id: number) => {
    // This function remains the same.
    // It updates the database, and the real-time subscription will handle the UI update.
    try {
      const optionToUpdate = options.find(opt => opt.id === id);
      if (!optionToUpdate) return;
      const newVoteCount = optionToUpdate.votes + 1;

      const { error } = await supabase
        .from('options')
        .update({ votes: newVoteCount })
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error updating vote:", error.message);
    }
  };

  if (loading) return <div className="container"><h2>Loading...</h2></div>;
  if (error) return <div className="container"><h2>Error: {error}</h2></div>;

  return (
    <div className="container">
      <h1>📊 Tech Framework Poll</h1>
      <p>Which framework do you prefer?</p>
      <div className="options-list">
        {options.map((option) => (
          <div key={option.id} className="option-item">
            <span className="option-name">{option.name}</span>
            <span className="option-votes">{option.votes} votes</span>
            <button onClick={() => handleVote(option.id)}>Vote</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;