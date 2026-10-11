import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-public-footer',
  standalone: true,
  templateUrl: './public-footer.html',
  styleUrl: './public-footer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicFooter {}
