import * as interactjs from 'interactjs';
import * as mousetrap from 'mousetrap';
import * as React from 'react';
import styled from 'styled-components';
import {
  move,
  setInverted,
  setOpacity,
  toggleInverted,
  toggleLock,
  resize
} from '../core/reducer';
import { Coords } from '../helpers/Coords';
import { ARROW_KEYS, getPositionByKey } from '../helpers/getPositionByKey';
import { setPositionInDOM } from '../helpers/impure';
import {
  startListeningAndSwapZIndex,
  startListeningToIgnoreMouseEvents,
  stopListeningAndSwapZIndex,
  stopListeningToIgnoreMouseEvents
} from '../helpers/mouseEvents';
import { Size } from '../helpers/Size';
import { MiniToolboxWrapper } from '../miniToolbox/MiniToolboxWrapper';
import { IOnionImage } from './IOnionImage';
import { OnionToolbox } from './OnionToolbox';

interface State {
  opacity: number;
  inverted: boolean;
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  locked: boolean;
}

const OnionImageWrapper = styled.div`
  position: fixed;

  & ${Coords}, & ${Size} {
    opacity: 0;
    transition: opacity 300ms ease;
  }

  &:hover ${Coords}, &:hover ${Size} {
    opacity: 1;
  }

  & ${MiniToolboxWrapper} {
    bottom: -18px;
    opacity: 0;
    transition: all 300ms ease;
  }

  &:hover ${MiniToolboxWrapper} {
    bottom: -36px;
    opacity: 1;
  }
`;

interface OnionImageElementProps {
  opacity: number;
  inverted: boolean;
  visible: boolean;
}

const OnionImageElement = styled.img<OnionImageElementProps>`
  opacity: ${({ opacity }) => opacity};
  filter: invert(${({ inverted }) => (inverted ? '100%' : '0%')});
  display: ${({ visible }) => (visible ? 'block' : 'none')};
`;

const opacityNumberKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const opacityLettersKeys = ['=', '+', '-', '_'];
const invertKeys = 'i';

interface Props {
  remove: () => void;
}

export default class OnionImage extends React.Component<
  IOnionImage & Props,
  State
> {
  private el: React.RefObject<HTMLDivElement> = React.createRef();
  private image: React.RefObject<HTMLImageElement> = React.createRef();

  bindKeys = () => {
    mousetrap.bind(opacityNumberKeys, ({ key }) => {
      const val = parseInt(key, 10) * 0.1;
      const opacity = parseFloat((val === 0 ? 1 : val).toFixed(1));
      this.setState(setOpacity(opacity));
    });

    mousetrap.bind(opacityLettersKeys, ({ keyCode }) => {
      let value = 0.05;
      if (keyCode === 45 || keyCode === 95) {
        // - 45 _ 95
        value *= -1;
      } else if (keyCode === 61 || keyCode === 43) {
        // = 61 + 43
        value *= 1;
      }

      const opacity: number = parseFloat(
        Math.max(0, Math.min(1, this.state.opacity + value)).toFixed(1)
      );

      this.setState(setOpacity(opacity));
    });

    mousetrap.bind(invertKeys, () => {
      this.setState(toggleInverted);
    });

    mousetrap.bind(ARROW_KEYS, ({ shiftKey, key }) => {
      if (this.state.locked) {
        return;
      }

      const { x, y } = this.state;
      const value = shiftKey ? 10 : 1;

      this.setState(getPositionByKey(key, x, y, value), () => {
        setPositionInDOM(this.el.current, this.state.x, this.state.y);
      });
    });
  };

  unbindKeys = () => {
    mousetrap.unbind(opacityLettersKeys);
    mousetrap.unbind(opacityNumberKeys);
    mousetrap.unbind(invertKeys);
    mousetrap.unbind(ARROW_KEYS);
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    return { ...nextProps, ...prevState };
  }

  componentDidMount() {
    const el = this.el.current as HTMLDivElement;
    const image = this.image.current as HTMLImageElement;

    startListeningToIgnoreMouseEvents(this.el.current);
    startListeningAndSwapZIndex(this.el.current);
    setPositionInDOM(this.el.current, this.state.x, this.state.y);

    image.onload = (() => {
      this.setState(resize(image.width, image.height));
    }).bind(this);

    el.addEventListener('mouseover', this.bindKeys);
    el.addEventListener('mouseout', this.unbindKeys);

    interactjs(el).draggable({
      onmove: ({ dx, dy, target }) => {
        if (this.state.locked) {
          return;
        }

        const x = (parseFloat(target.getAttribute('data-x')) || 0) + dx;
        const y = (parseFloat(target.getAttribute('data-y')) || 0) + dy;

        setPositionInDOM(target, x, y);

        this.setState(move(x, y));
      }
    });
  }

  componentWillUnmount() {
    const el = this.el.current as HTMLDivElement;

    stopListeningToIgnoreMouseEvents(el);
    stopListeningAndSwapZIndex(el);
    this.unbindKeys();

    el.removeEventListener('mouseover', this.bindKeys);
    el.removeEventListener('mouseout', this.unbindKeys);
  }

  render() {
    const { src, remove } = this.props;
    const {
      opacity,
      visible,
      inverted,
      x,
      y,
      height,
      width,
      locked
    } = this.state;
    return (
      <OnionImageWrapper innerRef={this.el}>
        <OnionImageElement
          innerRef={this.image}
          src={src}
          visible={visible}
          opacity={opacity}
          inverted={inverted}
        />
        <Coords x={x} y={y} />
        <Size width={width} height={height} />
        <OnionToolbox
          opacity={opacity}
          inverted={inverted}
          setInverted={(inverted) => this.setState(setInverted(inverted))}
          setOpacity={(opacity) => this.setState(setOpacity(opacity))}
          toggleLock={() =>
            this.setState(toggleLock, () => {
              interactjs(this.el.current as HTMLDivElement).styleCursor(
                !this.state.locked
              );
            })
          }
          remove={remove}
          locked={locked}
        />
      </OnionImageWrapper>
    );
  }
}
