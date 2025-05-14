import { Injectable, signal } from '@angular/core';
import {
  ChipCore,
  ChipProps,
  ChipServiceProps,
  type ChipEvents,
} from '../../../core/components/chip';

@Injectable()
export class ChipService {
  private chipCoreSignal = signal<ChipCore | null>(null);

  get chipCore(): ChipCore | null {
    return this.chipCoreSignal();
  }

  initialize(
    events: ChipEvents,
    props: {
      isClickable: ChipProps['isClickable'];
    }
  ) {
    const chipCore = new ChipCore(events, props.isClickable || false);

    this.chipCoreSignal.set(chipCore);
  }

  update(props: ChipServiceProps) {
    this.chipCoreSignal()?.update(props);
  }
}
