// 봇 계정 관리 페이지 (유멜론 봇 전용)
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bot, Plus, Settings, Trash2, Eye, EyeOff } from 'lucide-react';

interface BotAccount {
  id: string;
  accountName: string;
  isActive: boolean;
  channelCount: number;
  maxChannels: number;
  createdAt: string;
  updatedAt: string;
}

export default function BotAccountsPage() {
  const [accounts, setAccounts] = useState<BotAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCredentials, setShowCredentials] = useState<{ [key: string]: boolean }>({});

  // 새 계정 폼 상태
  const [newAccount, setNewAccount] = useState({
    accountName: '',
    nidAuth: '',
    nidSession: '',
    maxChannels: 10,
  });

  // 편집 중인 계정
  const [editingAccount, setEditingAccount] = useState<BotAccount | null>(null);
  const [editForm, setEditForm] = useState({
    accountName: '',
    nidAuth: '',
    nidSession: '',
    maxChannels: 10,
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bot/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('봇 계정 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAccount = async () => {
    if (!newAccount.accountName || !newAccount.nidAuth || !newAccount.nidSession) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch('/api/bot/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccount),
      });

      if (response.ok) {
        alert('봇 계정이 추가되었습니다!');
        setNewAccount({ accountName: '', nidAuth: '', nidSession: '', maxChannels: 10 });
        loadAccounts();
      } else {
        const error = await response.json();
        alert(`봇 계정 추가 실패: ${error.error}`);
      }
    } catch (error) {
      console.error('봇 계정 추가 실패:', error);
      alert('봇 계정 추가 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const updateAccount = async () => {
    if (!editingAccount) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/bot/accounts/${editingAccount.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        alert('봇 계정이 업데이트되었습니다!');
        setEditingAccount(null);
        loadAccounts();
      } else {
        const error = await response.json();
        alert(`봇 계정 업데이트 실패: ${error.error}`);
      }
    } catch (error) {
      console.error('봇 계정 업데이트 실패:', error);
      alert('봇 계정 업데이트 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async (accountId: string) => {
    if (!confirm('정말로 이 봇 계정을 비활성화하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/bot/accounts/${accountId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('봇 계정이 비활성화되었습니다.');
        loadAccounts();
      } else {
        alert('봇 계정 비활성화에 실패했습니다.');
      }
    } catch (error) {
      console.error('봇 계정 비활성화 실패:', error);
      alert('봇 계정 비활성화 중 오류가 발생했습니다.');
    }
  };

  const toggleCredentials = (accountId: string) => {
    setShowCredentials(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const startEdit = (account: BotAccount) => {
    setEditingAccount(account);
    setEditForm({
      accountName: account.accountName,
      nidAuth: '', // 보안상 빈 값으로 시작
      nidSession: '', // 보안상 빈 값으로 시작
      maxChannels: account.maxChannels,
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>봇 계정을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8 text-blue-600" />
            봇 계정 관리
          </h1>
          <p className="text-gray-600">치지직 봇 계정을 관리하고 설정합니다.</p>
        </div>
      </div>

      {/* 새 계정 추가 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            새 봇 계정 추가
          </CardTitle>
          <CardDescription>
            치지직 봇 계정을 추가합니다. NID_AUT와 NID_SES 쿠키가 필요합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="accountName">계정명</Label>
              <Input
                id="accountName"
                value={newAccount.accountName}
                onChange={(e) => setNewAccount({...newAccount, accountName: e.target.value})}
                placeholder="유멜론봇1"
              />
            </div>
            
            <div>
              <Label htmlFor="maxChannels">최대 채널 수</Label>
              <Input
                id="maxChannels"
                type="number"
                value={newAccount.maxChannels}
                onChange={(e) => setNewAccount({...newAccount, maxChannels: parseInt(e.target.value) || 10})}
                placeholder="10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="nidAuth">NID_AUT 쿠키</Label>
            <Textarea
              id="nidAuth"
              value={newAccount.nidAuth}
              onChange={(e) => setNewAccount({...newAccount, nidAuth: e.target.value})}
              placeholder="NID_AUT=..."
              rows={2}
            />
            <p className="text-sm text-gray-500 mt-1">
              치지직에서 개발자 도구 → Application → Cookies → NID_AUT 값
            </p>
          </div>

          <div>
            <Label htmlFor="nidSession">NID_SES 쿠키</Label>
            <Textarea
              id="nidSession"
              value={newAccount.nidSession}
              onChange={(e) => setNewAccount({...newAccount, nidSession: e.target.value})}
              placeholder="NID_SES=..."
              rows={2}
            />
            <p className="text-sm text-gray-500 mt-1">
              치지직에서 개발자 도구 → Application → Cookies → NID_SES 값
            </p>
          </div>

          <Button onClick={addAccount} disabled={saving} className="w-full">
            {saving ? '추가 중...' : '봇 계정 추가'}
          </Button>
        </CardContent>
      </Card>

      {/* 봇 계정 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>봇 계정 목록</CardTitle>
          <CardDescription>등록된 봇 계정들을 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length > 0 ? (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{account.accountName}</h3>
                      <Badge variant={account.isActive ? "default" : "secondary"}>
                        {account.isActive ? '활성' : '비활성'}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      <p>관리 채널: {account.channelCount}/{account.maxChannels}개</p>
                      <p>생성일: {new Date(account.createdAt).toLocaleDateString('ko-KR')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleCredentials(account.id)}
                    >
                      {showCredentials[account.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(account)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteAccount(account.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">등록된 봇 계정이 없습니다.</p>
          )}
        </CardContent>
      </Card>

      {/* 편집 다이얼로그 */}
      <Dialog open={!!editingAccount} onOpenChange={() => setEditingAccount(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>봇 계정 편집</DialogTitle>
            <DialogDescription>
              봇 계정 정보를 수정합니다. 쿠키는 보안상 빈 값으로 표시됩니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="editAccountName">계정명</Label>
              <Input
                id="editAccountName"
                value={editForm.accountName}
                onChange={(e) => setEditForm({...editForm, accountName: e.target.value})}
              />
            </div>
            
            <div>
              <Label htmlFor="editMaxChannels">최대 채널 수</Label>
              <Input
                id="editMaxChannels"
                type="number"
                value={editForm.maxChannels}
                onChange={(e) => setEditForm({...editForm, maxChannels: parseInt(e.target.value) || 10})}
              />
            </div>
            
            <div>
              <Label htmlFor="editNidAuth">NID_AUT 쿠키 (새로 입력 시에만 업데이트)</Label>
              <Textarea
                id="editNidAuth"
                value={editForm.nidAuth}
                onChange={(e) => setEditForm({...editForm, nidAuth: e.target.value})}
                placeholder="새로운 NID_AUT 값 (비워두면 기존 값 유지)"
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="editNidSession">NID_SES 쿠키 (새로 입력 시에만 업데이트)</Label>
              <Textarea
                id="editNidSession"
                value={editForm.nidSession}
                onChange={(e) => setEditForm({...editForm, nidSession: e.target.value})}
                placeholder="새로운 NID_SES 값 (비워두면 기존 값 유지)"
                rows={2}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingAccount(null)}>
                취소
              </Button>
              <Button onClick={updateAccount} disabled={saving}>
                {saving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


