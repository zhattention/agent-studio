import React, { useEffect, useState } from 'react';
import { getTeamJobs, stopTeamJob } from '@/services/api';
import '../styles/ThreadViewer.css'; // Import ThreadViewer styles

interface Job {
  id: string;
  team_name: string;
  content: string;
  duration: number;
  max_duration: number;
  created_at: string;
}

interface JobManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const JobManager: React.FC<JobManagerProps> = ({ isOpen, onClose }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTeamJobs();
      if (response.status === 'success') {
        setJobs(response.jobs);
      } else {
        setError('Failed to load jobs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleStopJob = async (teamName: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await stopTeamJob(teamName);
      if (response.status === 'success') {
        await loadJobs(); // 重新加载任务列表
      } else {
        setError('Failed to stop job');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop job');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadJobs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="thread-viewer">
      <div className="thread-header">
        <h2>Team Jobs Manager</h2>
        <button className="thread-close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="thread-content">
        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading-box">Loading...</div>
        ) : (
          <div className="job-container">
            {jobs.length === 0 ? (
              <div className="empty-message">
                No active jobs
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="job-box">
                  <div className="job-box-header">
                    <h3>{job.team_name}</h3>
                    <button
                      onClick={() => handleStopJob(job.team_name)}
                      className="stop-job-btn"
                    >
                      Stop
                    </button>
                  </div>
                  <div className="job-box-content">
                    <p className="job-content-text">{job.content}</p>
                    <div className="job-metadata">
                      <p>Duration: {job.duration}s</p>
                      <p>Max Duration: {job.max_duration}s</p>
                      <p>Created: {new Date(job.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobManager; 