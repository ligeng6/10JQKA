import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

export default function Index() {
  const startGame = (mode: 'ffa' | '2v2') => {
    Taro.navigateTo({ url: `/pages/game/index?mode=${mode}` });
  };

  return (
    <View className='index'>
      <View className='title'>
        <Text className='title-text'>原创扑克</Text>
        <Text className='title-sub'>一副牌就能玩的对战</Text>
      </View>

      <View className='mode-select'>
        <Button className='mode-btn' onClick={() => startGame('ffa')}>
          混战模式
        </Button>
        <Button className='mode-btn' onClick={() => startGame('2v2')}>
          2V2 组队
        </Button>
      </View>

      <View className='rules-hint'>
        <Text>4人对战 · 计分牌5/10/K共100分</Text>
        <Text>集齐4张奔流牌直接获胜</Text>
      </View>
    </View>
  );
}
