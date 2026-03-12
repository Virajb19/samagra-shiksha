import React from 'react';
import CircularsScreen from '../../../../src/components/CircularsScreen';

export default function CircularsTabScreen() {
    return (
        <CircularsScreen
            role="IE_RESOURCE_PERSON"
            queryKey={['circulars', 'ie-resource-person']}
            canAccessOverride={({ hasCompletedProfile, isActive }) => hasCompletedProfile && isActive}
        />
    );
}
