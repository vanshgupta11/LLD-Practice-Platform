import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { HealthStatus } from '../types';

export function useHealth() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .checkHealth()
      .then((data: HealthStatus) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err.message || 'Failed to connect to backend service.');
        setLoading(false);
      });
  }, []);

  return { health, loading, error };
}
