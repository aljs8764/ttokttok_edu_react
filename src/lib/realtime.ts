'use client';

import { useEffect, useRef } from 'react';
import { Client, type IMessage } from '@stomp/stompjs';

/**
 * STOMP 구독 (스펙 6장). 원장·실장은 /topic/inst.{기관}, 교사는 담당 반 /topic/class.{반}.
 * 메시지가 오면 화면은 REST 로 다시 조회한다 — 소켓은 "바뀌었다"는 신호로만 쓴다.
 * 연결이 끊기면 5초 뒤 새 토큰으로 재연결.
 */
export function useRealtime(destinations: string[], onMessage: (payload: Record<string, unknown>) => void) {
  const handler = useRef(onMessage);
  handler.current = onMessage;
  const key = destinations.slice().sort().join(',');

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_WS_URL;
    if (!url || destinations.length === 0) return;

    const client = new Client({
      brokerURL: url,
      reconnectDelay: 5_000,
      heartbeatIncoming: 20_000,
      heartbeatOutgoing: 20_000,
      // 재연결 때마다 최신 access 토큰을 받는다
      beforeConnect: async () => {
        const res = await fetch('/api/auth/ws-token', { cache: 'no-store' });
        if (!res.ok) {
          await client.deactivate();
          return;
        }
        const { token } = (await res.json()) as { token: string };
        client.connectHeaders = { Authorization: `Bearer ${token}` };
      },
      onConnect: () => {
        destinations.forEach((d) =>
          client.subscribe(d, (m: IMessage) => {
            try {
              handler.current(JSON.parse(m.body));
            } catch {
              handler.current({});
            }
          }),
        );
      },
    });
    client.activate();
    return () => {
      void client.deactivate();
    };
    // destinations 내용이 바뀔 때만 재연결
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
