'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Eye, Calendar, Building2, FileText, Tag, Users, Loader2, MapPin, Clock, Search } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getFileURL } from '@/services/firebase/notice.firestore';
import noticesApi, { type Notice, type NoticeType, noticeTypeLabels } from '@/services/notices.service';

interface ViewNoticeButtonProps {
  notice: Notice;
}

const typeStyles: Record<string, string> = {
  'GENERAL': 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  'INVITATION': 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  'PUSH_NOTIFICATION': 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
};

const roleLabels: Record<string, string> = {
  'TEACHER': 'Teacher',
  'HEADMASTER': 'Headmaster',
  'ADMIN': 'Admin',
  'SUPER_ADMIN': 'Super Admin',
};

export function ViewNoticeButton({ notice }: ViewNoticeButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');

  // Fetch full notice details (with recipients) only when dialog is open
  const { data: fullNotice, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['notices', notice.id, 'details'],
    queryFn: () => noticesApi.getById(notice.id),
    enabled: showDialog,
    staleTime: 1000 * 60 * 5,
  });

  const noticeData = fullNotice || notice;
  const recipients = fullNotice?.recipients || [];
  const recipientCount = notice._count?.recipients ?? recipients.length;

  const filteredRecipients = recipients.filter(r => {
    if (!recipientSearch) return true;
    const q = recipientSearch.toLowerCase();
    return (
      r.user.name.toLowerCase().includes(q) ||
      r.user.email?.toLowerCase().includes(q) ||
      r.user.phone.includes(q)
    );
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const hasFile = Boolean(notice.file_url);

  const handleViewFile = async () => {
    if (notice.file_url) {
      try {
        const fileUrl = await getFileURL(notice.file_url);
        window.open(fileUrl, '_blank');
      } catch (err) {
        console.error('Failed to get file URL:', err);
      }
    }
  };

  return (
    <>
      {/* Eye button → View Details */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setShowDialog(true)}
            className="p-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-400/10 rounded-lg transition-all"
          >
            <Eye className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>View Details</p>
        </TooltipContent>
      </Tooltip>

      {/* File button → Open File (only if file exists) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={hasFile ? handleViewFile : undefined}
            className={`p-2 rounded-lg transition-all ${hasFile
              ? 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-400/10 cursor-pointer'
              : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
              }`}
            disabled={!hasFile}
          >
            <FileText className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{hasFile ? 'View File' : 'No file attached'}</p>
        </TooltipContent>
      </Tooltip>

      {/* Notice Details Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) setRecipientSearch(''); }}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/50 rounded-2xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white text-xl font-semibold flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg">
                  <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                Notice Details
              </div>
              <Badge className={typeStyles[noticeData.type] || typeStyles['GENERAL']}>
                {noticeTypeLabels[noticeData.type as NoticeType] || noticeData.type}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-4">
            {/* Title */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {noticeData.title}
              </h3>
            </div>

            {/* Content */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700/50">
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {noticeData.content}
              </p>
            </div>

            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-3">
              {noticeData.school && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{noticeData.school.name}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">Created: {formatDate(noticeData.created_at)}</span>
              </div>

              {noticeData.expires_at && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">Expires: {formatDate(noticeData.expires_at)}</span>
                </div>
              )}

              {noticeData.subject && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Tag className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">Subject: {noticeData.subject}</span>
                </div>
              )}

              {noticeData.venue && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">Venue: {noticeData.venue}</span>
                </div>
              )}

              {noticeData.event_time && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">Time: {noticeData.event_time}</span>
                </div>
              )}

              {noticeData.creator && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">By: {noticeData.creator.name}</span>
                </div>
              )}
            </div>



            {/* Recipients Section */}
            {recipientCount > 0 && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <Users className="h-4 w-4" />
                    <span className="text-sm font-semibold">Recipients</span>
                    <Badge className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs">
                      {recipientCount}
                    </Badge>
                  </div>
                </div>

                {isLoadingDetails ? (
                  <div className="flex items-center justify-center py-8 gap-2">
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                    <span className="text-sm text-slate-500 dark:text-slate-400">Loading recipients...</span>
                  </div>
                ) : recipients.length > 0 ? (
                  <>
                    {/* Search bar for recipients */}
                    {recipients.length > 5 && (
                      <div className="mb-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            placeholder="Search recipients..."
                            value={recipientSearch}
                            onChange={(e) => setRecipientSearch(e.target.value)}
                            className="pl-9 h-9 text-sm bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400"
                          />
                        </div>
                      </div>
                    )}

                    {/* Scrollable recipients list */}
                    <div className="max-h-[240px] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredRecipients.map((recipient, idx) => (
                        <div
                          key={recipient.user.id}
                          className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {recipient.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                {recipient.user.name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {recipient.user.phone}
                                {recipient.user.email && ` · ${recipient.user.email}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <Badge className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400">
                              {roleLabels[recipient.user.role] || recipient.user.role}
                            </Badge>
                            {recipient.is_read && (
                              <div className="w-2 h-2 rounded-full bg-green-500" title="Read" />
                            )}
                          </div>
                        </div>
                      ))}
                      {filteredRecipients.length === 0 && recipientSearch && (
                        <div className="py-6 text-center text-sm text-slate-400">
                          No recipients match &quot;{recipientSearch}&quot;
                        </div>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
