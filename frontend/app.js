const { useState, useEffect } = React;

function App() {
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState('');

  const searchJobs = async () => {
    const res = await fetch(`/api/jobs/search?query=${query}`);
    const data = await res.json();
    setJobs(data);
  };

  return (
    <div>
      <h1>Job Search</h1>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search for jobs..." />
      <button onClick={searchJobs}>Search</button>
      <ul>
        {jobs.map(job => (
          <li key={job._id}>
            <h3>{job._source.title}</h3>
            <p>{job._source.description}</p>
            <p><b>Salary: </b>${job._source.salary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
