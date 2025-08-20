import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import './App.css';
import LiveTyper from './LiveTyper';
interface Option {
  id: number;
  name: string;
  votes: number;
}

function App() {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // --- NEW STATE ---
  // For the "add new option" form input
  const [newOptionName, setNewOptionName] = useState('');
  // For showing loading state on the specific button being clicked
  const [isVoting, setIsVoting] = useState<number | null>(null);

  useEffect(() => {
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

    const channel = supabase
      .channel('options-channel')
      .on(
        'postgres_changes',
        // Listen to INSERT and UPDATE events now
        { event: '*', schema: 'public', table: 'options' },
        (payload) => {
          // Refetch data to get the latest list and order
          fetchOptions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleVote = async (id: number) => {
    // Check local storage to prevent multiple votes
    if (localStorage.getItem('hasVotedPoll')) {
      alert("You've already voted in this poll.");
      return;
    }

    setIsVoting(id); // Set loading state for this button
    try {
      const optionToUpdate = options.find(opt => opt.id === id);
      if (!optionToUpdate) return;
      
      const newVoteCount = optionToUpdate.votes + 1;

      const { error } = await supabase
        .from('options')
        .update({ votes: newVoteCount })
        .eq('id', id);

      if (error) throw error;

      // Set flag in local storage after a successful vote
      localStorage.setItem('hasVotedPoll', 'true');

    } catch (error: any) {
      console.error("Error updating vote:", error.message);
    } finally {
      setIsVoting(null); // Reset loading state
    }
  };
  
  // --- NEW FUNCTION ---
  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newOptionName.trim() === '') return;

    try {
      const { error } = await supabase
        .from('options')
        .insert({ name: newOptionName.trim(), votes: 0 });

      if (error) throw error;
      
      setNewOptionName(''); // Clear input on success
    } catch (error: any) {
      console.error('Error adding option:', error.message);
      alert('Failed to add option.');
    }
  };

  if (loading) return <div className="container"><h2>Loading...</h2></div>;
  if (error) return <div className="container"><h2>Error: {error}</h2></div>;

  return (
    <div className="container">
      <h1>📊 Tech Framework Poll</h1>
      <p>Which framework do you prefer?</p>
      <hr className="separator" /> {/* Add a separator */}

      {/* --- ADD THE NEW LIVE TYPER COMPONENT --- */}
      <LiveTyper />
      {/* --- NEW FORM --- */}
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
    </div>
  );
}

export default App;