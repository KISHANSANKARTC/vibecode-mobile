import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Loader2,
  Trash2,
  Maximize2,
  Minimize2,
  User,
  Bot,
} from 'lucide-react-native';
import { useAISupportChat } from '@/hooks/useAISupportChat';

interface SaraChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SaraChat({ isOpen, onClose }: SaraChatProps) {
  const {
    messages,
    isLoading,
    isEscalated,
    sendMessage,
    escalateToHuman,
    clearMessages,
  } = useAISupportChat();

  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (scrollViewRef.current && messages.length > 0) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const content = inputValue.trim();
    setInputValue('');
    await sendMessage(content);
  };

  const quickActions = [
    'How do I book?',
    'Payments',
    'Verification',
  ];

  const handleQuickAction = (action: string) => {
    setInputValue(action);
  };

  return (
    <View
      className={`absolute z-50 bg-white rounded-2xl shadow-xl ${
        isExpanded
          ? 'inset-4'
          : 'bottom-20 left-4 right-4'
      }`}
      style={{
        height: isExpanded ? '85%' : 500,
        maxHeight: 500,
        borderWidth: 1,
        borderColor: '#E5E5E5',
      }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-[#E5E5E5]">
        <View className="flex-row items-center gap-3 flex-1">
          <View className="w-10 h-10 rounded-full bg-[rgba(250,86,16,0.1)] items-center justify-center">
            <Bot size={20} color="#FA5610" strokeWidth={2} />
          </View>
          <View className="flex-1">
            <Text className="text-[#171717] font-semibold text-sm">Sara</Text>
            <Text className="text-[#737373] text-xs">
              {isEscalated ? 'Human Support' : 'AI Assistant'}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          {messages.length > 0 && (
            <Pressable onPress={clearMessages}>
              <Trash2 size={18} color="#737373" strokeWidth={2} />
            </Pressable>
          )}

          <Pressable onPress={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? (
              <Minimize2 size={18} color="#737373" strokeWidth={2} />
            ) : (
              <Maximize2 size={18} color="#737373" strokeWidth={2} />
            )}
          </Pressable>

          <Pressable onPress={onClose}>
            <X size={20} color="#737373" strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      {/* Messages Area */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4 py-4"
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.length === 0 ? (
          <View className="flex-1 items-center justify-center py-8">
            <View className="w-20 h-20 rounded-full bg-[rgba(250,86,16,0.1)] items-center justify-center mb-4">
              <Bot size={40} color="#FA5610" strokeWidth={1.5} />
            </View>
            <Text className="text-[#171717] font-semibold text-base mb-2">
              Hi, I'm Sara!
            </Text>
            <Text className="text-[#737373] text-xs text-center mb-6 px-4">
              I'm here to help with any questions about Engage. I can assist
              with bookings, payments, verification, and more!
            </Text>

            <View className="gap-2 w-full">
              {quickActions.map((action) => (
                <Pressable
                  key={action}
                  onPress={() => handleQuickAction(action)}
                  className="border border-[#E5E5E5] rounded-xl px-3 py-2"
                >
                  <Text className="text-[#171717] text-xs text-center font-medium">
                    {action}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View className="gap-3">
            {messages.map((message) => (
              <View
                key={message.id}
                className={`flex-row gap-2 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <View className="w-6 h-6 rounded-full bg-[rgba(250,86,16,0.1)] items-center justify-center flex-shrink-0">
                    <Bot size={14} color="#FA5610" strokeWidth={2} />
                  </View>
                )}

                <View
                  className={`max-w-xs rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-[#FA5610] rounded-br-none'
                      : 'bg-[#F5F5F5] rounded-bl-none'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      message.role === 'user'
                        ? 'text-white'
                        : 'text-[#171717]'
                    }`}
                  >
                    {message.content}
                  </Text>
                  <Text
                    className={`text-xs mt-1 ${
                      message.role === 'user'
                        ? 'text-white/70'
                        : 'text-[#737373]'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </Text>
                </View>

                {message.role === 'user' && (
                  <View className="w-6 h-6 rounded-full bg-[#D4D4D4] items-center justify-center flex-shrink-0">
                    <User size={14} color="#737373" strokeWidth={2} />
                  </View>
                )}
              </View>
            ))}

            {isLoading ? (
              <View className="flex-row gap-2 justify-start">
                <View className="w-6 h-6 rounded-full bg-[rgba(250,86,16,0.1)] items-center justify-center">
                  <Bot size={14} color="#FA5610" strokeWidth={2} />
                </View>
                <View className="bg-[#F5F5F5] rounded-2xl rounded-bl-none px-4 py-3">
                  <Loader2 size={16} color="#FA5610" strokeWidth={2} />
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      {/* Talk to Human Button */}
      {!isEscalated && messages.length > 0 && !isLoading && (
        <View className="px-4 py-2 border-t border-[#E5E5E5]">
          <Pressable
            onPress={escalateToHuman}
            className="border border-[#FA5610] rounded-xl py-2 flex-row items-center justify-center gap-2"
          >
            <User size={16} color="#FA5610" strokeWidth={2} />
            <Text className="text-[#FA5610] font-semibold text-sm">
              Talk to Human
            </Text>
          </Pressable>
        </View>
      )}

      {/* Input Area */}
      <View className="flex-row items-center gap-3 px-4 py-3 border-t border-[#E5E5E5]">
        <TextInput
          value={inputValue}
          onChangeText={setInputValue}
          placeholder={
            isEscalated
              ? 'Message our support team...'
              : 'Ask Sara anything...'
          }
          placeholderTextColor="#A3A3A3"
          editable={!isLoading}
          className="flex-1 bg-[#F5F5F5] rounded-xl px-4 py-2 text-[#171717] text-sm"
          multiline
        />
        <Pressable
          onPress={handleSend}
          disabled={isLoading || !inputValue.trim()}
          className="bg-[#FA5610] rounded-lg p-2.5 items-center justify-center"
          style={{ opacity: isLoading || !inputValue.trim() ? 0.5 : 1 }}
        >
          <Send size={16} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}
