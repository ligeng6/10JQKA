import { useState, useCallback } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import type { GameState, Card, GameMode } from '@pokergame/shared';
import { createGame, playCards, passTurn, getScores } from '@pokergame/core';
import { CardView } from '../../components/card';
import './index.scss';

export default function Game() {
  const router = useRouter();
  const mode = (router.params.mode as GameMode) ?? 'ffa';

  const [gameState, setGameState] = useState<GameState>(() =>
    createGame({ mode }),
  );
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [message, setMessage] = useState('');

  const myIndex = 0;
  const myHand = gameState.players[myIndex]?.hand ?? [];
  const scores = getScores(gameState);
  const isMyTurn = gameState.currentPlayerIndex === myIndex;
  const isFinished = gameState.phase === 'finished';

  const toggleCard = useCallback((card: Card) => {
    setSelectedCards((prev) => {
      const exists = prev.find((c) => c.id === card.id);
      if (exists) return prev.filter((c) => c.id !== card.id);
      return [...prev, card];
    });
  }, []);

  const handlePlay = useCallback(() => {
    if (selectedCards.length === 0) {
      setMessage('请先选牌');
      return;
    }
    const { state, error } = playCards(gameState, myIndex, selectedCards);
    if (error) {
      setMessage(error);
      return;
    }
    setGameState(state);
    setSelectedCards([]);
    setMessage('');
  }, [gameState, selectedCards, myIndex]);

  const handlePass = useCallback(() => {
    const { state, error } = passTurn(gameState, myIndex);
    if (error) {
      setMessage(error);
      return;
    }
    setGameState(state);
    setSelectedCards([]);
    setMessage('');
  }, [gameState, myIndex]);

  const handleRestart = useCallback(() => {
    setGameState(createGame({ mode }));
    setSelectedCards([]);
    setMessage('');
  }, [mode]);

  return (
    <View className='game'>
      {/* 顶部信息栏 */}
      <View className='top-bar'>
        <Text className='round-info'>第{gameState.roundNumber}轮</Text>
        <Text className='deck-info'>牌库:{gameState.deck.length}</Text>
        {isFinished && (
          <Text className='win-info'>
            {gameState.winnerIndexes.includes(myIndex) ? '你赢了！' : '游戏结束'}
          </Text>
        )}
      </View>

      {/* 对手区域 */}
      <View className='opponents'>
        {gameState.players
          .filter((p) => p.index !== myIndex)
          .map((p) => (
            <View key={p.index} className='opponent'>
              <Text className='opponent-name'>玩家{p.index}</Text>
              <Text className='opponent-cards'>手牌:{p.hand.length}</Text>
              <Text className='opponent-score'>分数:{scores[p.index]}</Text>
              {p.benliu.length > 0 && (
                <Text className='opponent-benliu'>奔流:{p.benliu.length}</Text>
              )}
            </View>
          ))}
      </View>

      {/* 牌桌中央 */}
      <View className='table'>
        {gameState.currentTrick.length > 0 ? (
          <View className='trick-area'>
            {gameState.currentTrick
              .filter((t) => !t.isPass)
              .map((t, i) => (
                <View key={i} className='trick-play'>
                  <Text className='trick-player'>玩家{t.playerIndex}</Text>
                  <View className='trick-cards'>
                    {t.cards.map((c) => (
                      <CardView key={c.id} card={c} small />
                    ))}
                  </View>
                </View>
              ))}
          </View>
        ) : (
          <Text className='table-hint'>等待出牌...</Text>
        )}
      </View>

      {/* 我的手牌 */}
      <View className='my-area'>
        <Text className='my-info'>
          我的手牌 ({myHand.length}) | 分数:{scores[myIndex]}
          {gameState.players[myIndex]?.benliu.length
            ? ` | 奔流:${gameState.players[myIndex]?.benliu.length}`
            : ''}
        </Text>
        <View className='my-hand'>
          {myHand.map((card) => (
            <CardView
              key={card.id}
              card={card}
              selected={selectedCards.some((c) => c.id === card.id)}
              onClick={() => toggleCard(card)}
            />
          ))}
        </View>
      </View>

      {/* 操作区 */}
      <View className='actions'>
        {isFinished ? (
          <Button className='action-btn restart' onClick={handleRestart}>
            再来一局
          </Button>
        ) : isMyTurn ? (
          <>
            <Button className='action-btn play' onClick={handlePlay}>
              出牌 ({selectedCards.length})
            </Button>
            <Button className='action-btn pass' onClick={handlePass}>
              过牌
            </Button>
          </>
        ) : (
          <Text className='waiting'>等待其他玩家...</Text>
        )}
      </View>

      {message && (
        <View className='message'>
          <Text>{message}</Text>
        </View>
      )}
    </View>
  );
}
