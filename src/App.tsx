import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import './App.css';
import LiveTyper from './LiveTyper';

// Defines the shape of our data
interface Option {
  id: number;
  name: string;
  votes: number;
}

function App() {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for the "add new option" form input
  const [newOptionName, setNewOptionName] = useState('');
  // State for showing a loading indicator on the specific button being clicked
  const [isVoting, setIsVoting] = useState<number | null>(null);

  useEffect(() => {
    // Function to fetch the latest poll data from Supabase
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

    // Fetch the initial data when the component first loads
    fetchOptions();

    // Set up a Supabase real-time subscription
    const channel = supabase
      .channel('options-channel')
      .on(
        'postgres_changes',
        // Listen to all events (INSERT, UPDATE, DELETE) on the 'options' table
        { event: '*', schema: 'public', table: 'options' },
        (_payload) => {
          // When a change is detected, refetch all data to ensure the UI is in sync
          fetchOptions();
        }
      )
      .subscribe();

    // Cleanup function to remove the channel subscription when the component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // The empty array ensures this effect runs only once

  // Handles the logic for when a user clicks the "Vote" button
  const handleVote = async (id: number) => {
    // Check local storage to prevent a user from voting multiple times
    if (localStorage.getItem('hasVotedPoll')) {
      alert("You've already voted in this poll.");
      return;
    }

    setIsVoting(id); // Set loading state for the clicked button
    try {
      const optionToUpdate = options.find(opt => opt.id === id);
      if (!optionToUpdate) return;
      
      const newVoteCount = optionToUpdate.votes + 1;

      const { error } = await supabase
        .from('options')
        .update({ votes: newVoteCount })
        .eq('id', id);

      if (error) throw error;

      // Set a flag in local storage after a successful vote
      localStorage.setItem('hasVotedPoll', 'true');

    } catch (error: any) {
      console.error("Error updating vote:", error.message);
    } finally {
      setIsVoting(null); // Reset loading state
    }
  };
  
  // Handles the form submission for adding a new poll option
  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newOptionName.trim() === '') return;

    try {
      const { error } = await supabase
        .from('options')
        .insert({ name: newOptionName.trim(), votes: 0 });

      if (error) throw error;
      
      setNewOptionName(''); // Clear the input field on success
    } catch (error: any) {
      console.error('Error adding option:', error.message);
      alert('Failed to add option.');
    }
  };

  // Conditional rendering for loading and error states
  if (loading) return <div className="container"><h2>Loading...</h2></div>;
  if (error) return <div className="container"><h2>Error: {error}</h2></div>;

  // Main component JSX
  return (
    <div className="container">
      {/* --- SECTION 1: The Poll --- */}
      <h1>📊 Tech Framework Poll</h1>
      <p>Which framework do you prefer?</p>
      
      <form onSubmit={handleAddOption} className="add-option-form">
        <input
          type="text"
          placeholder="Or add a new one..."
          value={newOptionName}
          onChange={(e) => setNewOptionName(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>
      
      <div className="options-list">
        {options.map((option) => (
          <div key={option.id} className="option-item">
            <span className="option-name">{option.name}</span>
            <span className="option-votes">{option.votes} votes</span>
            <button 
              onClick={() => handleVote(option.id)}
              disabled={isVoting === option.id}
            >
              {isVoting === option.id ? 'Voting...' : 'Vote'}
            </button>
          </div>
        ))}
      </div>

      {/* --- SECTION 2: The Realtime Test --- */}
      <hr className="separator" />
      <LiveTyper />
    </div>
  );
}

export default App;