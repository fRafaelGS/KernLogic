import React, { useEffect, useState } from 'react';
import { useSpring, animated } from '@react-spring/web';

interface AnimatedValueProps {
  value: number;
  duration?: number;
  delay?: number;
  formatter?: (value: number) => string;
  className?: string;
}

export const AnimatedValue: React.FC<AnimatedValueProps> = ({
  value,
  duration = 800,
  delay = 100,
  formatter = (val: number) => Math.round(val).toString(),
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  // Start animation after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Configure spring animation
  const { number } = useSpring({
    from: { number: 0 },
    number: isVisible ? value : 0,
    delay,
    config: {
      duration,
      tension: 300,
      friction: 40,
    },
  });

  return (
    <animated.span className={className}>
      {number.to((n) => formatter(n))}
    </animated.span>
  );
}; 