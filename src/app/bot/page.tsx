// 유멜론 봇 관리 대시보드 메인 페이지
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Bot, Settings, MessageSquare, Users, Activity } from 'lucide-react';

interface BotConfig {
  id: string;
  channelId: string;
  channelName: string;
  isActive: boolean;
  isLive: boolean;
  lastConnected?: string;
  activeCommandsCount: number;
  uptime: number;
}

interface BotCommand {
  id: string;
  trigger: string;
  response: string;
  permission: string;
  cooldown: number;
  isActive: boolean;
}

export default function BotDashboard() {
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [commands, setCommands] = useState<BotCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 폼 상태
  const [channelId, setChannelId] = useState('');
  const [channelName, setChannelName] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [moderationEnabled, setModerationEnabled] = useState(false);
  const [donationAlertEnabled, setDonationAlertEnabled] = useState(true);
  const [botAccountId, setBotAccountId] = useState('');
  const [botAccounts, setBotAccounts] = useState<any[]>([]);

  // 명령어 폼 상태
  const [newCommand, setNewCommand] = useState({
    trigger: '',
    response: '',
    permission: 'everyone',
    cooldown: 0,
  });

  useEffect(() => {
    loadBotAccounts();
    // 초기 로딩 시에는 빈 상태로 시작
    setLoading(false);
  }, []);

  // 채널 ID가 변경되면 해당 설정 로드 (무한 루프 방지)
  useEffect(() => {
    if (channelId && channelId !== 'your_channel_id_here' && channelId !== '') {
      const timeoutId = setTimeout(() => {
        loadBotData(channelId);
      }, 500); // 500ms 지연으로 연속 호출 방지
      
      return () => clearTimeout(timeoutId);
    }
  }, [channelId]);

  const loadBotData = async (channelIdToLoad?: string) => {
    try {
      setLoading(true);
      
      // 채널 ID가 제공되면 사용, 아니면 현재 입력된 채널 ID 사용
      const targetChannelId = channelIdToLoad || channelId;
      
      if (!targetChannelId || targetChannelId === 'your_channel_id_here') {
        console.log('유효한 채널 ID가 없어서 봇 데이터를 로드할 수 없습니다.');
        setConfig(null);
        setCommands([]);
        setLoading(false);
        return;
      }
      
      console.log('봇 데이터 로딩 시작:', targetChannelId);
      
      // 봇 설정 조회
      const configResponse = await fetch(`/api/bot/config?channelId=${targetChannelId}`);
      if (configResponse.ok) {
        const configData = await configResponse.json();
        console.log('봇 설정 로드됨:', configData);
        
        setConfig(configData);
        // 상태 업데이트 시 무한 루프 방지를 위해 조건부 업데이트
        if (configData.channelId !== channelId) {
          setChannelId(configData.channelId);
        }
        if (configData.channelName !== channelName) {
          setChannelName(configData.channelName);
        }
        setWelcomeMessage(configData.welcomeMessage || '');
        setAutoReplyEnabled(configData.autoReplyEnabled);
        setModerationEnabled(configData.moderationEnabled);
        setDonationAlertEnabled(configData.donationAlertEnabled);
        setBotAccountId(configData.botAccountId || '');

        // 명령어 조회
        const commandsResponse = await fetch(`/api/bot/commands?configId=${configData.id}`);
        if (commandsResponse.ok) {
          const commandsData = await commandsResponse.json();
          setCommands(commandsData);
        }
      } else {
        console.log('봇 설정을 찾을 수 없음:', targetChannelId);
        // 설정이 없으면 초기화
        setConfig(null);
        setCommands([]);
      }
    } catch (error) {
      console.error('봇 데이터 로딩 실패:', error);
      setConfig(null);
      setCommands([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBotAccounts = async () => {
    try {
      const response = await fetch('/api/bot/accounts');
      if (response.ok) {
        const data = await response.json();
        setBotAccounts(data);
      }
    } catch (error) {
      console.error('봇 계정 로딩 실패:', error);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      
      // 봇 계정이 선택되지 않은 경우 경고
      if (!botAccountId) {
        alert('봇 계정을 선택해주세요.');
        setSaving(false);
        return;
      }
      
      const response = await fetch('/api/bot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          channelName,
          welcomeMessage,
          autoReplyEnabled,
          moderationEnabled,
          donationAlertEnabled,
          botAccountId,
        }),
      });

      if (response.ok) {
        const savedConfig = await response.json();
        setConfig(savedConfig);
        alert('봇 설정이 저장되었습니다!');
        // 저장된 설정의 채널 ID로 데이터 다시 로드
        await loadBotData(savedConfig.channelId);
      } else {
        alert('설정 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('설정 저장 실패:', error);
      alert('설정 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const toggleBotStatus = async () => {
    if (!config) return;

    try {
      const response = await fetch('/api/bot/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: config.channelId,
          isActive: !config.isActive,
        }),
      });

      if (response.ok) {
        alert(config.isActive ? '봇이 비활성화되었습니다.' : '봇이 활성화되었습니다.');
        loadBotData();
      } else {
        alert('봇 상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('봇 상태 변경 실패:', error);
      alert('봇 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const addCommand = async () => {
    if (!newCommand.trigger || !newCommand.response) {
      alert('명령어와 응답을 입력해주세요.');
      return;
    }

    if (!config) {
      alert('먼저 봇 설정을 저장해주세요.');
      return;
    }

    // 트리거에 ! 접두사 추가
    const trigger = newCommand.trigger.startsWith('!') ? newCommand.trigger : `!${newCommand.trigger}`;

    try {
      const response = await fetch('/api/bot/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configId: config.id,
          ...newCommand,
          trigger,
        }),
      });

      if (response.ok) {
        alert('명령어가 추가되었습니다!');
        setNewCommand({ trigger: '', response: '', permission: 'everyone', cooldown: 0 });
        loadBotData();
      } else {
        alert('명령어 추가에 실패했습니다.');
      }
    } catch (error) {
      console.error('명령어 추가 실패:', error);
      alert('명령어 추가 중 오류가 발생했습니다.');
    }
  };

  const deleteCommand = async (commandId: string) => {
    if (!confirm('정말로 이 명령어를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/bot/commands/${commandId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('명령어가 삭제되었습니다.');
        loadBotData();
      } else {
        alert('명령어 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('명령어 삭제 실패:', error);
      alert('명령어 삭제 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>봇 데이터를 불러오는 중...</p>
            <p className="text-sm text-gray-500 mt-2">
              채널 ID를 입력하면 해당 설정을 자동으로 불러옵니다.
            </p>
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
            유멜론 봇 관리
          </h1>
          <p className="text-gray-600">치지직 채팅 관리 봇 설정 및 관리</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/bot/accounts">봇 계정 관리</a>
          </Button>
        </div>
        {config && (
          <Button
            onClick={toggleBotStatus}
            variant={config.isActive ? "destructive" : "default"}
            className="flex items-center gap-2"
          >
            <Activity className="h-4 w-4" />
            {config.isActive ? '봇 비활성화' : '봇 활성화'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 봇 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              봇 설정
            </CardTitle>
            <CardDescription>유멜론 봇의 기본 설정을 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="channelId">채널 ID</Label>
              <Input
                id="channelId"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="치지직 채널 ID"
              />
            </div>
            
            <div>
              <Label htmlFor="channelName">채널명</Label>
              <Input
                id="channelName"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="채널명"
              />
            </div>

            <div>
              <Label htmlFor="botAccount">봇 계정</Label>
              <Select value={botAccountId} onValueChange={setBotAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="봇 계정을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {botAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.accountName} ({account.channelCount}/{account.maxChannels} 채널)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                봇이 사용할 계정을 선택하세요. 계정이 없으면 <a href="/bot/accounts" className="text-blue-600 underline">봇 계정 관리</a>에서 추가하세요.
              </p>
            </div>

            <div>
              <Label htmlFor="welcomeMessage">환영 메시지</Label>
              <Textarea
                id="welcomeMessage"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="방송 시작 시 전송할 환영 메시지"
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="autoReply">자동 응답</Label>
                <Switch
                  id="autoReply"
                  checked={autoReplyEnabled}
                  onCheckedChange={setAutoReplyEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="moderation">채팅 관리</Label>
                <Switch
                  id="moderation"
                  checked={moderationEnabled}
                  onCheckedChange={setModerationEnabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="donationAlert">후원 알림</Label>
                <Switch
                  id="donationAlert"
                  checked={donationAlertEnabled}
                  onCheckedChange={setDonationAlertEnabled}
                />
              </div>
            </div>

            <Button onClick={saveConfig} disabled={saving} className="w-full">
              {saving ? '저장 중...' : '설정 저장'}
            </Button>
          </CardContent>
        </Card>

        {/* 봇 상태 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              봇 상태
            </CardTitle>
            <CardDescription>현재 봇의 상태 정보입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {config ? (
              <>
                <div className="flex items-center justify-between">
                  <span>상태</span>
                  <Badge variant={config.isActive ? "default" : "secondary"}>
                    {config.isActive ? '활성' : '비활성'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span>방송 상태</span>
                  <Badge variant={config.isLive ? "default" : "outline"}>
                    {config.isLive ? '방송 중' : '방송 종료'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span>활성 명령어</span>
                  <span className="font-medium">{config.activeCommandsCount}개</span>
                </div>

                <div className="flex items-center justify-between">
                  <span>연결 시간</span>
                  <span className="font-medium">
                    {config.lastConnected ? 
                      new Date(config.lastConnected).toLocaleString('ko-KR') : 
                      '연결 안됨'
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>가동 시간</span>
                  <span className="font-medium">
                    {Math.floor(config.uptime / 3600)}시간 {Math.floor((config.uptime % 3600) / 60)}분
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-2">봇 설정을 먼저 구성해주세요.</p>
                <p className="text-sm text-gray-400">
                  채널 ID, 채널명, 봇 계정을 입력하고 "설정 저장"을 클릭하세요.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 명령어 관리 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            명령어 관리
          </CardTitle>
          <CardDescription>봇이 응답할 명령어들을 설정합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 새 명령어 추가 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="trigger">명령어</Label>
              <Input
                id="trigger"
                value={newCommand.trigger}
                onChange={(e) => setNewCommand({...newCommand, trigger: e.target.value})}
                placeholder="!공지"
              />
            </div>
            
            <div>
              <Label htmlFor="response">응답</Label>
              <Input
                id="response"
                value={newCommand.response}
                onChange={(e) => setNewCommand({...newCommand, response: e.target.value})}
                placeholder="안녕하세요!"
              />
            </div>
            
            <div>
              <Label htmlFor="permission">권한</Label>
              <Select
                value={newCommand.permission}
                onValueChange={(value) => setNewCommand({...newCommand, permission: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">모든 사용자</SelectItem>
                  <SelectItem value="subscriber">구독자</SelectItem>
                  <SelectItem value="moderator">관리자</SelectItem>
                  <SelectItem value="streamer">스트리머</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button onClick={addCommand} className="w-full">
                명령어 추가
              </Button>
            </div>
          </div>

          {/* 명령어 목록 */}
          <div className="space-y-2">
            {commands.length > 0 ? (
              commands.map((command) => (
                <div key={command.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{command.trigger}</span>
                      <Badge variant="outline">{command.permission}</Badge>
                      {command.cooldown > 0 && (
                        <Badge variant="secondary">{command.cooldown}초 쿨다운</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{command.response}</p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteCommand(command.id)}
                  >
                    삭제
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">등록된 명령어가 없습니다.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

