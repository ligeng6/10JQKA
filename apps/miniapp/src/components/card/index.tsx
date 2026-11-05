import { View, Text } from '@tarojs/components';
import type { Card } from '@pokergame/shared';
import { cardLabel, SUIT_LABEL, rankLabel } from '@pokergame/shared';
import './index.scss';

interface CardViewProps {
  card: Card;
  selected?: boolean;
  small?: boolean;
  onClick?: () => void;
}

export function CardView({ card, selected, small, onClick }: CardViewProps) {
  const isRed =
    card.kind === 'normal' && (card.suit === 'heart' || card.suit === 'diamond');
  const isJoker = card.kind === 'joker';
  const isBigJoker = isJoker && card.joker === 'big';

  return (
    <View
      className={`card ${selected ? 'selected' : ''} ${small ? 'small' : ''} ${
        isRed ? 'red' : isJoker ? (isBigJoker ? 'big-joker' : 'small-joker') : 'black'
      }`}
      onClick={onClick}
    >
      {isJoker ? (
        <View className='card-face joker-face'>
          <Text className='joker-text'>{isBigJoker ? '大' : '小'}</Text>
          <Text className='joker-label'>王</Text>
        </View>
      ) : (
        <View className='card-face'>
          <Text className='card-rank'>{rankLabel(card.rank)}</Text>
          <Text className='card-suit'>{SUIT_LABEL[card.suit]}</Text>
        </View>
      )}
    </View>
  );
}
