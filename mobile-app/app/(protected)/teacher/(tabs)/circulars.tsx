import React from 'react';
import CircularsScreen from '../../../../src/components/CircularsScreen';

export default function CircularsTabScreen() {
  return (
    <CircularsScreen
      role="TEACHER"
      queryKey={['circulars', 'teacher']}
      canAccessOverride={({ hasCompletedProfile, isActive }) => hasCompletedProfile && isActive}
    />
  );
}
