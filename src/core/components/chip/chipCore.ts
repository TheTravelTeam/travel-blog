import { type ChipEvents, ChipProps, ChipServiceProps } from './chip.type';

export const chipDefaultProps: Required<Omit<ChipProps, 'id' | 'text'>> = {
  color: 'green',
  isClickable: false,
};

export class ChipCore {
  constructor(
    private events: ChipEvents,
    private isClickable: ChipServiceProps['isClickable']
  ) {}

  public handleClick(e: Event) {
    if (this.isClickable) {
      this.events.onClick(e);
    }
  }

  public handleRemove(e: Event) {
    this.events.onRemove(e);
  }

  public toData() {
    return {
      events: this.events,
      isClickable: this.isClickable,
    };
  }

  public static fromData(chipData: ReturnType<ChipCore['toData']>) {
    const newNewChipDataCore = new ChipCore(chipData.events, chipData.isClickable);
    return newNewChipDataCore;
  }

  public update(props: ChipServiceProps) {
    this.isClickable = props.isClickable;
  }
}
