// src/components/icons/OveliaIcon.tsx
import React from 'react';
import oveliaImg from '../../assets/ovelialogo.jpeg';

export interface OveliaIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /**  
   * You can also add a `size` prop if you’d rather:  
   * size?: number;  
   * then spread `width={size} height={size}` onto the <img>  
   */
}

const OveliaIcon: React.FC<OveliaIconProps> = ({
  className = '',
  ...imgProps
}) => (
  <img
    src={oveliaImg}
    alt="Ovelia logo"
    className={`object-contain ${className}`}
    {...imgProps}
  />
);

export default OveliaIcon;
