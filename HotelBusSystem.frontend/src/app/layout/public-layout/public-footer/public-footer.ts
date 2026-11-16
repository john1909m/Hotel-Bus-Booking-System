import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-public-footer',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './public-footer.html',
  styleUrl: './public-footer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicFooter {}
