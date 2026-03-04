import type { Row, Workbook, Worksheet } from 'exceljs';
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  format,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import {
  COUNTRY_LIST,
  getCountryName,
  isNonSchengenEU,
  isSchengenCountry,
} from '@/lib/constants/schengen-countries';

export const MAX_GANTT_TEMPLATE_DAYS = 500;
export const MAX_UNLIMITED_TEMPLATE_EMPLOYEE_ROWS = 1000;
const WORKBOOK_FONT_SIZE = 16;
const TEMPLATE_DATE_COLUMN_WIDTH = 11;
const TEMPLATE_HEADER_ROW_HEIGHT = 60;
const HIDDEN_TEMPLATE_TRAILING_ROWS = 500;
const REFERENCE_SHEET_TITLE_FILL = 'FFEAF2FF';
const REFERENCE_SHEET_SECTION_FILL = 'FFE2E8F0';
const REFERENCE_SHEET_TABLE_HEADER_FILL = 'FFE8F0FE';
const REFERENCE_SHEET_PANEL_FILL = 'FFF8FAFC';
const REFERENCE_SHEET_BORDER = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
} as const;
const REFERENCE_TITLE_ROW_HEIGHT = 36; // ~48 px
const REFERENCE_SUBTITLE_ROW_HEIGHT = 18; // ~24 px
const REFERENCE_EXAMPLE_HEADER_ROW_HEIGHT = 30; // ~40 px
const COMPLYEUR_HORIZONTAL_LOGO_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAABZCAYAAAAQL3IEAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAByKSURBVHgB7Z3fUxtXlsdPt0BgY8vCDB5PHMetbGUqsTNlvLtT8+thxMvWDE4q8tu+Wbzsw85OGf8FiL/A8BeA/wIzVRt731Bextndh5CqdZzKZkLPxklIbIzABmz96LvntLoZGaR7b6tbUgPnUyUD7qa5+tHne8+Pe64BMSSbm0q/BJgWADn8cfzjxVkbGIZhmFhhQMz4VW4qV3Wc+cdra+nN588hc/489Pf1LeChGRYShmGY+BAbAfllbsrCL/Olzc3sdz/8AI7j7B5LnzoFo6dP28n+fhKRBWAYhmF6TiwEBMVjulytTn27upre2t5uek5/fz+cGRmBU6nUMg76GnsjDMMwvaWnAoLCka1huOrp+rr1ZH39Fa+jFSQkFNbq6+ubxcHPsZAwDMP0hp4IiJ8k39rZmXq0ugqVSgWCwmEthmGY3tJ1AUGvI49exy1Kkq+h1xEGP6w1nEotCoCb7I0wDMN0j64JiJ8kR9HI/rC2phWu0mVwYADeOHeOqrUKgxjWKi7OloBhGIbpKAnoAl6SfOHrb799e31jA4QQECXVWg3W6jmUrJlM/vOFS7/ZePT5x8vAMAzDdIyOeiDtJMnD4oe10qnUAvDaEYZhmI7REQGJIkkeltSJE3D2zBk3rIUiMgMMwzBMpEQuIL/I3bzhOLXC6g8/pEubm9BryBsZGR62TdPkai2GYZgIiUxAOpkkDwuHtRiGYaIntIBQuOoFwA3VSvI4QGtHSEg4rMUwDBOeUALSmCQnr+OgQCIyOjJio490878WZxeBYRiGCUxbAhKHJHlYOKzFMAwTjsDrQChJXnacxW+//z67+vhxrHIdQaBxP3v+HCrV6tjg4GD+wsVfDz76/OOPgGEYhtFC2wOJc5I8Cvywlglw7c+Ls7wIkWEYRoFSQPwk+YuXLwvkccQ5SR4WDmsxDMPoIw1hUZL8pePcW3v6NPfou+8OZK4jCK+EtQYGctal3xgY1voYGIZhmH009UA8r+PW9s5O/qAmycOSME1agOiGtYD3ZWcYhtnHPgHxV5J/s7qaptn4UYfCWq+fPQvHjx1bgA6EtdLvvpd1hBgTAi4DiDQYRtoQwsJDJWEYJRCiZBiGbTrORzAwsFxaXrSBYSKCPn+y46X/+fciHAAoWgLdxz7qE8tXBATfhHnMdeRXvv66p0lymv2fxtl/Eo33Y0zYl2PgAZ1DEcHciA0ReCOeaHwgAPIoEGkIho2Csmj298+xmDBhOXlxQtoa+9lnd2Ox7bUKtF3RtvjWgyaUBTjCmI0/4IsxibH/mb974w0bjSX0Alot/tabmdKPR0Zunk6lrryVydhkvElMesHQ8eNgnT9P4lGEkOJBwnHy0tWlmuMsCSGm2hAPwqLfrZXLK3it+fRYzgKGYZge0Lf3P0hRUc0X0GgXzoyMXLcfPeqKB0CGGvMNcOLYsbkBgELDplAZ2sXw+ODg9NrGhvU05C6GupBgjdYrsopQn2kUoU3QyKdr1fI8CkcOokSIPApJPnVxorD52V1uzcIwTFeRuqf+2o/S5ma2U6EkCldR23UdQ43jKWBCf5rWoXSq068fPvvRcNo2zcRkGOEghsYmxhJluIP+tQWdxDCKif7+axjW4t0YGW04hBWKIx/CMvCFX8Kvk7LQDHkA+IUMt/U4wp5XNMMnQ50wEzfva/ak8kStsLWzc/3b1dVIRa1edXW61GcmZnA8s83O8dfFYIboU1UfLRIPs2IstRmqagc7kUyOc26E0YUFJBScA8GwSnZ7Z2eFEuiecd4H7aOBjwzlJd6yrND5EQpXYW6jhCGymeNm4sr9AA0NSejwkR86dizz00xmOYr8iD+es6OjM0NmItNKPGhr3h2AFfy2gMkjqSj0QDwIyymX71DIDBiGYTpMn1OrAVVdYfI6jwY9T/kPaFGuSoYVjy/6+ZH/++47ePHiBehChv41NPho/Iug8HpUeL97hbyj1Imh6SfrpcDekZ93GVKU6P4qN5XD6c0t/NbSmY5RYpsMuYAA4mEYJby2LQQsG0Js0H8JAy5QWS+KUFb3MjjOMQfDfPjtTWAYxgXvrUW8NyIN7+I1j3zLI+Mfrv5BfLGysvsfjXtm4I+3WxlV8lbwBby1vrmZU+VH/LwCejDL+CbeDJtXaDGeQrlcvv746VNLlR/ZI2Qt8y5ebTkZ42yTw5OtdjjEpPaKds4DcxfCMGb6nvctl+zm+Yu0hUn4oXLOEDCte11hmuPPD0gNP9M7jlAIa7wTdueos09AfEhIRk+ftgf6++dahXSIxvwIVUjV9qwfoeucHf2RNK8QFX5+BBPtTb0jX8hQIIsgFw66zjw0Fw6fpgKSeve9G8Jx1M+TFgk6zuSzh/cC7Ucy9M7VKdMQtzROtfHmzwDDSGABYcLQUkAIv53HqVTKxlm7dE9xEhL0AKZ9D0BSlttx9npHNQzTkXCMDKdLlLBv9Tz8BDl+W9D4M/sExAtdLWl4CXbCccZLn/+HDW0wdAnzK6CRXzFg8tmDuwvAMC1gAWHC0Cc7SN4ElcyiIbZw1k5JdgrnNBUS+j88XqT8yE/OnLlummaxhuGq+z1oje6F3a6RqGHCf7rm1NIoHHODALPNhMwXDkyQTxmK5LiMWj33YClOCyUexNaDu8sn3n3vGuZKluRnGtfxnwWIADcxXylbYJivvj7VPrv0ee+rvpqOr69vud2y5vTbOQv6qtYr/xniemFo+tyEUyrh5wAYpsN4E/IxVOi0QS2W6rkkt42L1APZS0O7cxvqM/Bis/PIIHfT41AhG09jghyC8YoHQjc5eh+fqLwPFI9MGPFo5MTFiVmj7jG1JEwuxG+5gp5OTvq8KBznJhTF7UR/sthuGfHJn72fM2q1luE504Bre43myUsTeVcoWxQaUKJTGDCn44lptZjBnBU9z6CeHc7079BN2Oq42WRSQeOpCTHdsoii3iutiE/yT+16mkE9EAqhJgwh+8yVNj+7ewXaxH0PHGdedk6zz0HcPJBf5Kbo3vyg1fF2t9PG5yk11lQt2+bvFqkTyZ7zaUKch+b3vmv/pB7IXqgr7zerq+SVkEey1KpiK07iQTQbj58gF/I8hza1SplWmVuK0xaiEg+iL5ks1MplqYCYtRoZrSIE4OQ7v88ZpomemzOm9Qt1Y5ulB44HjfrVhQSGPAMLCXqKMqGqNszAdxdoCjq/te2gqjT8Zx4N5XSrNTKBOgXUjXlWdr2mGEZa1JtkKqFQKHqzNJ4syMdCr0cOn1+OxoNCMtPpkKWRMJaFI38e6B1n2520oHjkFJMw+yB4Xl4kw2p1XLUMQIIF7WPpHPM8jjtCMuHxMaENfCGxHz3Kq9aQxA0ap7d4kh5ZiAw3XCQFvY9I24244RR3RtwaYRhZ0IQMF/XqwmuiYRZ64tH0j7otVpbq3kH0+GtsAq7ut3BMn1D+qPE/vbzVJzglVIvH/utRPzLl+x4EP48WpHTbHw8JZYqEpIO4wqD4zJlhWvYYxm8VZxSB6RieHV/SEQ+iLQHxod0JaQ3JN99/n69UqyvotulUB/UMalUP9YWAWYgQN0atvuEj9T58cKbwJ8Upl0EDMsptGq5WdMSgkYENsUAzbQrYXWgZoOihNULM7hWldvHCoKHGg79boCab0EEw9/YRyMfwAbQBvR+qiUsCw5HAdBKaWFu6J4cSEJ/SxgZ88dVXZMzan3l0AQPEFHSCalVpQDAXcRs6wOaDD2cTTjIjeYyrruEb5VCGtAVk0KIUEbdQIdzqfgoP3fKvFcFzdkUJIoDGFcl7gB5g6tLVjk3mzGRyVnGKlX77dxYExKlUVPbjQISvDirekgwrwK9AoBwI0xxHHe4pdXJRX5gqqN2QSYjqMxWuiLzz+43Nh/dUhkcK5XMwJJeHsKCBxfDaR/QVosGicF2Y/EMtkfhthOMBavmPuayPgq4z0oFCp+jlFGXeqmOaedArh99F5bmg58PeR4egCiv0Jm6oKhH2wgISAUJQ3Fby0htGbGdNmqXHu9VHiVqyCC/qLSGqJ6pjRq2WNzBurZo5o+GfRrFaDNPoEa9xa8+YSoYjbqNr6Y4Hx3DZKze01BeD/WEefI6N4RlB8XjtkF7IkmkhFqDZeDBEid6rLeo7U6bR283pvN7e79N+McVOlB6745KEgoU6l/EKbuFAuZyVnWMKEbkYMnW8+6YVtvcgLGj47LGARIGBIRWZfgjxKcQQN8mtmvX6K+Y/u9vs5i3Sg8IVNdMk4y4LQaSpsgi/KkNqOuDLPfP8wYeFfX8Ex1I1zSlVeXMjVOqLid9rzXJUdD0nkVAXFaDQUA4jCmNN46kZMLn14MNmE49F+jvVcpmeoyo0SDkVCtsWIGLM/v4FNPitw2QBX49aRS4eJKadyCEyLbHxHps7hpOiVmvn6CsLSATQHuZS108IG2KIAQa6rHKn1QExvvXwntSD8m7sa24Fl2zGjsfClHjujkmIm1stwmHeWKZOXJwATRGxze3keKs+ZN71riifG0GL/UI22HPFDMezabc2vJ5RLnjPUSoiQr+zQiC0wlgvX+bxi17YUpgfuKsjWp8QNodIyw4gKj5enDXgkIJPTNk9xD8WSRL9qCMotCA7bhqRhxDCQgu2VLNqmuVvBUha0oZW3qLClhi0MC4cC1sauRRaI6MaC+F2BbDVs2RqeKk6p6ZZ+ijBdj0hW2/W/vyzuwX8ogrrpEm0oROYpjQngaE3/WosQy7OiZpTBKbjkHjcX5yd0l3LxwISBYqqIGGYNsSMmhCq9Qu2Z6C0oVmpMtGJohVmvxLdtTTuWBxHXuIcICxCXpPxtzhwR0DPai5omAZfD2XbfjPqrZT9v51IFKUirfle02RGcQ/9icNXXcEeCOitsoAcUQxFOKbdihe3xFM+8097q/YDYxiwHMiQGIb03MC5KcX6h7D0t5Ekdl8P1WLSNtdlKP+2WqTTVY0Sd+VkxoDArwsTHPI+gnYRYQE5gtCsUFXFY5pyo9QKLz4vDXsZor1QjxDwV4iSOOWmQiWJlfkBq1O7VDqJxILsuI73o5jMlLijdHcw2ljlzwISBcq4v2NBnFDPCkN1elWtjsd8gtbq+CasQ4TEKTdlhPButPID9QR/5HitTVq+jjhRkXoXQ5dyqrJr9j66RLKNEC1XYUUA3vzU4rjlDM9wurovuhLlwseQ61Zo3QLUapIT9JoKHiXMhGj7NSfP5eSlqyVpHsF0X/NQ72sr8PN/W7SueEvLKu8SopyX1QFG2MHBBkZKO01wWUAiQFCsXWYUDcOCOKFqBRIytJOoVJZrptS5tYB5hapIhPKGVJOYmmN0bBLjmOYi5kJalkyb9a7CxaYH64s1W/2qHWEHh0neUCp6OIQVAXjzSGPzIUI2zBGhr1q1IQRCUTDQSZQVakbzJL5G88QiMLGGBSQKTFMeGgjTGp1hDgYtQ03oYIw1a66oWn3OnXfjDwtIBDjqnEHnFnMxh4OEGSrEFGYr5ijAMNWC7DjeI02qsaR76HDn3QNAZDmQhHl0taivr2+5VqlIk5heOWMRIob6WRlC2s5i/xaj9a1QJb8CwxCGvj4LHFlbCohN9VNsCJnkVm6lbIqOvuZeIr9laxNvVfqs/7O7C6SkeSJ33j0YhLb6JByjIyPw1puZEi1EgXhDq5htiBidtQ9UztiRWnxh0h7eVstHkxJLAUpjEipnU1O0djEMrojZi1Ntv7DA29BM+pqHTdLrIC3f9por+j+qFpNy592DQSgBSZ86BW9euFA6MzIyM2QmMvcXZ2chxtAm8FDvBqvVDiMIhnpnQL8zamRQEhJNj/RGbLZS2IGkaqYbbuGZ40hXPke+IPAQEKrQQmO1N3nJ0GGoQ6/s+KuiIWn3zp13m/Lr3FTscqltCcjQ8eNgnT8Pr//4x3Op/v4MGuZCOzXEvQDHatN48dsMSBJ/QXFvHsWCQvQIpqPa/pTw9vKQj6vJTK6/H2xlo8Hayyy0iUablCIwe8lBm2j0NSt1Yk+QfX+E/oasrYqARtGQPF8R2X0ZV4w2Gm9q7QHTZQIJiC8c1uuvF4eOHcu06tro94qPC83G4wlJHupCYkNItBoJAhl0d09uC0Jy8p3f5zT28mg6k9MJudUcU3s/jUbcLr8dapNyyGm70MJQb3rV0R5eryI1/q5oqJonHoXOu6K9MLFqotB1tAQkiVPWN86d84VjHA0vPey955Gh/mVuanrLcVbw6zw+LOgh+Pez+FjadpxPaFwSISERmYSQQqLRSJCgndeWwoiIewOa5rz6zNY3szLk5u3dAQGpSRaUeXB1TQtMxwm8jzntN6+cmXaxGWGiP7kouQdckVR4TIel866tOE62KQua0H7lIoSX2imkAkIJ8rOjo/BWJlM8OTTkC0dx73m+cGxWqyvfrK4WPv/yy/QXKyv50uZmT4SE3pifv//HpbX19SUcR/bhl19a33z/fWGzUvnE2zh+H5Qf8YSk7UQ7zewdRyu/4oqIuyNgQFLvvncDjfSScjU5PgdZEzqdkBsZtCC5EBobqD7kRvT5p8MCGoix1KWr2iLiLsTTaL/dzRm9691KQpToLV2XekyHpPOuoVdRp2Ubf465D3yfA08uukFTAfErq376ZsYeGR6eVAkHeRyP19YKf7HtNIqGe6xSqQCKCdiPHuW3d3a6IiS+cOBYXOFYffzYHQdR2tigsVh4bP7vr/5hRSIkBagn2tuKw249/HBW1V7bw6J9uWmnOxISmaGmY2hYpnC2uSIcR6tQgTZKkh3XCbmRQcM8i5aIUEhNY2w2bwwkRwhB77MytzU0NjHm4CQE1Cx0e0YvZBtNYdhV4jEdms67A3ol+xbUd0q0mh307Ssa6aVer/Npxb51ICgYKB6nSwkzMTcIMNsqOf6L3M0bW06t8HR9Pf1kfR2cFnX/W9vbsIIPzJ/kR0+fJreNZvqRzkJJOGq12jSKQ1Y2FhKTH9bWYH1z0xpOpUhIpjE8N+NVZ+3ihefyeN0C1Gd4gWKPiVpt0jHNJa2kV302lkWPZB4Nx7JwvR/fMxBpSrbhMfV1Gi+JXpSO0aCQGwrEDak3gzc81etj2Gyy1KQvEYmLg8l8MnygHtdtrq5RQ15F6tJEzjTMm3tf8/TbOcsxy9dFGQpC41q6G3BFCbU2UTZ3bE7HvA+aweP9HGkhAV5z+T8XZ5tu6EV2E/9eEb/NKi5j4WPFO5dyVbQXOd33l3fQmzfq38eWXQE5eeIEhatKaFClwkEzdwyhTD9Ze2LJjPVeSEjwYaGQFH72T/+Sx6/7DHdQSLkrdeHIBxlLUCH5VW5q0XMhLZ3rk5EcujRxzQRjKchNJOqVGWPQsE+5jpHYc4053Z0E6/taT9ANoMqnWBQ2O3lxwnY3aRL1EJ8BgsRNt5ok8A6HR4r64s7dzwq1/6gJ9zUHv88UbZ1cE+Ugn6e5Xgm2okNvUyLsvLsPI/x2w82uqTo+J9QC4pP1HrvXbXJ96jmWFh14Lu1imomEW1n1xmuvLchKcv2ENOYV5r/46iuLDLCuwW6EhIRCSZiTkIaSZJBr94/v//EWCsfKl5hraXcsvpD4oS0cS9Px3F+cXQyaaKe9xB0Q4zr7ckeGIW6jkQ601oRCBkJ/XYxV95io+ssNRWiLhyqkdtQx0FMwWny2/EWhAWf0dt92sgA9gjr0QjCi7LwbC8huQLTdJyZFzLo4mJjvcEty0UBOyoQDcxu7eYV2jPVeKCfxvysrjUKSVf2OKxzv/dv0X588WcHfnWpXOPbiCwk+PwufZ0shIQ8FvTNqC6JlcElEMJx1xejCXgQ023z24F4e2oA8A9G5LgKueHDoSg5tboVGdxKiof6a24s9MzaqjaaaUITDSVRGf6ZZ5Wuv6aMEebMDnkGfxgR4lowreQ6dgIQEH1b61KmlsYl/XRhMJve9UCQcz6vVGygcU09LpXQUotEMP/GPz9c6MzJCQkLJzFdCW57IFnSvSYYz/fbvxmuGUcAbKvo6brpJHWfy+cN7oeLH5LmcuDhB7WiUCdwAsHgEgIwuvgczId8D2zHg2rMYvOZUpCE0n8th7bxLtgztiE6YWMZtr7gnduyrwqK8grt2YmdnCUM72ZWvv+6YeDRCQvIX286jR7KCQuJWbL3icdh24cnTpx0Tj0Z8IVF5JLqQAX328F4ejWlGs0JLDQoHhZ4SW/2ZZyHFw4c8ETQ+4T0mf2zbySssHsHwvMH2Et/42SLB3orJOhv0qIqapx7qtUE0Aa3VIxc2BATvxZvegudYsisgZKwxWXwLk6Ur3RSOvTQKSbeFYy+NQvJsa8sVkp+H6EfjCsmDD8ddIcEkY1uGGo2EYRg3STjI2EQdpiDjs/nZXRQ6zPcEFbsGUevE2I4K9NoFmmzgeZiAHqfPVpwE2wtjFVXnHYXOu/+9OLtM4W+8P8gbsTV+pUiiE/f+grtVWF7Z2RzmRIZPDw9fJ+NZ9tZQ9AISEohB7TOtiUmnUjB0bNDGHyfpgwAh8W7yPH1PvbFMM2EZ1VpWGHABGjvZCuqaa5QMAz6lfcYTzxLFbhllrx5/gTYCqvX3jzUdnztGsGl8tCdK2CRoYiu5CIOSWPiLYLFkczs5i9dbiOx6OwNTeL1CVNeT4X1Gxun1dxKJnBBwGUXdcg/i58KghpSmYZu1/sXS54s2tEnCSWagg6A4fKSqRIqo825Hn0cUeOFvEoRZShFQEYq3vuMCft3AKbKNM3qb1pC0qoJFEbr2on27GPlr1LQSjbo+4pO5s1YqWU/X13sqJL3EXxPTZyZm4j4TYOINLRgF+QrsycOyiK4RfN7z0p5t6KGQ5wTMgaTpSvQ/4yybylZH0unJC+fO2TQDP0r4TSN/Mjo6dxDa1DNMXFE3ejz8nXcPM9JeWJT8SSaT4+fOnr3900zGbap4mKHnp9NtmGEYNdSiR7lTIre2OdAot7RtbOuBInJnfXNz7PHa2qEKa1GeA/M+8KPhtI35iMlmfb8YhtGHGj065fK0opPCYem8e2TR3hPdE5IrVM56fHBwem1jw82PHHQ4z8Ew7UO90PZuVuWJxx0RozbzTGdoq08Xlfy+AJiqVCrTtDJ98/lzOGhQnoM6Dp84dmxuAODA7KjIHEwOaxI9dXFiVtQXyLrViZjz0O3VZD+jcnHmQKPtgTTir8amzrrnX3utUNrcvH5QwlqU53jt7FnAHEcRf5y8H8P2AAxzgPjA69GVpR90m3+K6Nq2MD2kLQHxaciPFNOp1DS1ACEhiSOc52CYaKFQVdCtBghabHrYGiceVUIJiI/XK2qBEu0oJDdQRHY3looDnOdgmOhxKpUcBIU6Rj+4VwDmUKC1J7ou1PALQ0RXqOz3/LlzPS/75fUcDNM5BIWvgp3fdsdoJp5E4oE04oe1fp2bmk1lMj1Zzc55DobpLFR9RTtVap1MvboMg8NWh5DIBcTnz/WeURkq+z15/Pj046dPrU6Htfw8x8ip4eVEn3mT8xxMXDAc56/ubo4tME1xoKoA3d0sf/b+NbdHmmlcdns6Ne6oCEDbM3+KT6zIwnF46cp2u96m8YVKpXLdfvSoI94I5zkYhmG6S1f3aychwT8Y6Wp2fz0HhqtmZHu5MwzDMNHSVQHxobBWuVwOtZp9b54jjts9MgzDHGZ6IiBEu6vZOc/BMAwTD3omID5+fkRnNTvnORiGYeJDzwXEx9tzvOlqdspznB0dhcGBAc5zMAzDxITYCIgPrWZHL8Rdzb69s8N5DoZhmJgSOwEh/LAWDu4ybULPeQ6GYRiGYRiGOST8Pw0cBaNErWYnAAAAAElFTkSuQmCC';
const TEMPLATE_GRID_BORDER = {
  top: { style: 'thin', color: { argb: 'FFD0D5DD' } },
  left: { style: 'thin', color: { argb: 'FFD0D5DD' } },
  bottom: { style: 'thin', color: { argb: 'FFD0D5DD' } },
  right: { style: 'thin', color: { argb: 'FFD0D5DD' } },
} as const;

export type GanttTemplateRangeUnit = 'days' | 'weeks' | 'months';

export interface GanttTemplateRange {
  unit: GanttTemplateRangeUnit;
  value: number;
}

export interface GanttTemplateWorkbookOptions {
  anchorDate: Date;
  employeeRows: number;
  pastRange: GanttTemplateRange;
  futureRange: GanttTemplateRange;
}

export const DEFAULT_GANTT_TEMPLATE_OPTIONS: Omit<GanttTemplateWorkbookOptions, 'anchorDate'> = {
  employeeRows: 10,
  pastRange: { unit: 'months', value: 12 },
  futureRange: { unit: 'weeks', value: 12 },
};

export interface GanttTemplateBounds {
  startDate: Date;
  endDate: Date;
  totalDays: number;
}

export function getGanttTemplateBounds(
  anchorDate: Date,
  pastRange: GanttTemplateRange,
  futureRange: GanttTemplateRange
): GanttTemplateBounds {
  const normalizedAnchor = normalizeAnchorDate(anchorDate);
  const startDate = resolvePastDate(normalizedAnchor, pastRange);
  const endDate = resolveFutureDate(normalizedAnchor, futureRange);
  const totalDays = differenceInCalendarDays(endDate, startDate) + 1;

  return {
    startDate,
    endDate,
    totalDays,
  };
}

export function buildGanttTemplateDates(
  anchorDate: Date,
  pastRange: GanttTemplateRange,
  futureRange: GanttTemplateRange
): Date[] {
  const { startDate, totalDays } = getGanttTemplateBounds(anchorDate, pastRange, futureRange);

  if (totalDays > MAX_GANTT_TEMPLATE_DAYS) {
    throw new Error(
      `This selection creates ${totalDays} date columns. Reduce the range to ${MAX_GANTT_TEMPLATE_DAYS} days or fewer so the workbook stays import-compatible.`
    );
  }

  return Array.from({ length: totalDays }, (_, index) => addDays(startDate, index));
}

export async function generateGanttTemplateWorkbook(
  options: GanttTemplateWorkbookOptions
): Promise<{ filename: string; blob: Blob }> {
  const anchorDate = normalizeAnchorDate(options.anchorDate);
  const templateDates = buildGanttTemplateDates(
    anchorDate,
    options.pastRange,
    options.futureRange
  );
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'ComplyEur';
  workbook.created = anchorDate;
  workbook.modified = anchorDate;
  workbook.subject = 'ComplyEur Gantt Import Template';
  workbook.title = 'ComplyEur Gantt Import Template';

  addTemplateSheet(workbook, templateDates, options.employeeRows);
  addIsoCountryCodesSheet(workbook);
  addExampleInstructionsSheet(workbook);
  addWorkbookBranding(workbook);

  const buffer = await workbook.xlsx.writeBuffer();
  const bytes = toUint8Array(buffer);
  const blobBytes = new Uint8Array(bytes);

  return {
    filename: `complyeur_gantt_template_${format(options.anchorDate, 'yyyy-MM-dd_HH-mm-ss')}.xlsx`,
    blob: new Blob([blobBytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

function normalizeAnchorDate(anchorDate: Date): Date {
  return new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate());
}

function resolvePastDate(anchorDate: Date, range: GanttTemplateRange): Date {
  switch (range.unit) {
    case 'days':
      return subDays(anchorDate, range.value);
    case 'weeks':
      return subWeeks(anchorDate, range.value);
    case 'months':
      return subMonths(anchorDate, range.value);
    default:
      return anchorDate;
  }
}

function resolveFutureDate(anchorDate: Date, range: GanttTemplateRange): Date {
  switch (range.unit) {
    case 'days':
      return addDays(anchorDate, range.value);
    case 'weeks':
      return addWeeks(anchorDate, range.value);
    case 'months':
      return addMonths(anchorDate, range.value);
    default:
      return anchorDate;
  }
}

function addTemplateSheet(workbook: Workbook, dates: Date[], employeeRows: number) {
  const sheet = workbook.addWorksheet('Template', {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 1, showGridLines: false }],
  });
  const headers = ['Employee', ...dates.map(formatTemplateHeaderDate)];

  sheet.addRow(headers);

  sheet.getRow(1).font = { bold: false, size: WORKBOOK_FONT_SIZE };
  sheet.getRow(1).alignment = {
    horizontal: 'center',
    vertical: 'middle',
    wrapText: true,
  };
  sheet.getRow(1).height = TEMPLATE_HEADER_ROW_HEIGHT;
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE8F0FE' },
  };
  sheet.getCell('A1').font = { bold: true, size: WORKBOOK_FONT_SIZE };

  sheet.getColumn(1).width = 24;
  for (let index = 2; index <= headers.length; index += 1) {
    sheet.getColumn(index).width = TEMPLATE_DATE_COLUMN_WIDTH;
  }

  for (let index = 0; index < employeeRows; index += 1) {
    sheet.addRow(new Array(headers.length).fill(''));
  }

  for (let index = 0; index < HIDDEN_TEMPLATE_TRAILING_ROWS; index += 1) {
    const row = sheet.addRow(['']);
    row.hidden = true;
  }

  applySheetBaseStyle(sheet);
  applyTemplateBorders(sheet, headers.length, employeeRows + 1);
}

function addIsoCountryCodesSheet(workbook: Workbook) {
  const sheet = workbook.addWorksheet('ISO Country Codes', {
    views: [{ state: 'frozen', ySplit: 3, showGridLines: false }],
  });

  sheet.columns = [
    { width: 23 },
    { width: 14 },
    { width: 28 },
    { width: 23 },
    { width: 18 },
    { width: 65 },
  ];

  createReferenceHeader(sheet, 'ISO Country Codes Reference', 'A1:F1');
  createReferenceSubtitle(
    sheet,
    'Use the alpha-2 country codes below when filling the Template sheet. Official ISO reference: ISO 3166 country codes.',
    'A2:F2'
  );
  const officialLinkCell = sheet.getCell('A3');
  sheet.mergeCells('A3:F3');
  officialLinkCell.value = {
    text: 'Official ISO 3166 country codes: https://www.iso.org/iso-3166-country-codes.html',
    hyperlink: 'https://www.iso.org/iso-3166-country-codes.html',
  };
  officialLinkCell.font = {
    size: WORKBOOK_FONT_SIZE,
    color: { argb: 'FF1D4ED8' },
    underline: true,
  };
  officialLinkCell.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet.getRow(3).height = 24;

  const groupedCountries = buildIsoRegions();
  let currentRow = 5;

  for (const [regionName, countries] of groupedCountries) {
    sheet.mergeCells(`A${currentRow}:F${currentRow}`);
    const regionCell = sheet.getCell(`A${currentRow}`);
    regionCell.value = regionName;
    regionCell.font = { bold: true, size: WORKBOOK_FONT_SIZE };
    regionCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: REFERENCE_SHEET_SECTION_FILL },
    };
    regionCell.alignment = { horizontal: 'left', vertical: 'middle' };
    regionCell.border = REFERENCE_SHEET_BORDER;
    sheet.getRow(currentRow).height = 24;
    currentRow += 1;

    const headerRow = sheet.getRow(currentRow);
    headerRow.values = ['Group', 'Code', 'Country', 'Status', 'Counts', 'Notes'];
    styleReferenceTableHeader(headerRow, 6);
    currentRow += 1;

    for (const country of countries) {
      const status = isSchengenCountry(country.code)
        ? 'Schengen'
        : isNonSchengenEU(country.code)
          ? 'EU (non-Schengen)'
          : 'Non-Schengen';
      const countsTowardLimit = isSchengenCountry(country.code) ? 'Yes' : 'No';
      const notes = isSchengenCountry(country.code)
        ? 'Counts toward the 90/180 rule'
        : isNonSchengenEU(country.code)
          ? 'EU country but does not count toward Schengen days'
          : 'Does not count toward Schengen days';

      const row = sheet.getRow(currentRow);
      row.values = [
        country.groupLabel,
        country.code,
        getCountryName(country.code),
        status,
        countsTowardLimit,
        notes,
      ];
      styleReferenceDataRow(row, 6);
      currentRow += 1;
    }

    currentRow += 1;
  }
}

function addExampleInstructionsSheet(workbook: Workbook) {
  const sheet = workbook.addWorksheet('Example & Instructions', {
    views: [{ state: 'frozen', ySplit: 2, showGridLines: false }],
  });

  sheet.columns = [
    { width: 24 },
    { width: 24 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
  ];

  createReferenceHeader(sheet, 'ComplyEur Gantt Template Guide', 'A1:I1');
  createReferenceSubtitle(
    sheet,
    'Reference only. Use the Template sheet for uploads. This page shows how to fill the workbook and what a correct entry looks like.',
    'A2:I2'
  );

  const introLines = [
    'Fill in one row per employee.',
    'Use a 2-letter ISO country code in each date cell where the employee is travelling.',
    'Use the ISO Country Codes sheet if you are unsure which code to use.',
    'Upload the Template sheet structure. This sheet is for reference only.',
  ];

  sheet.addRow([]);
  addMergedSectionHeader(sheet, 4, 'Quick Start', 'A4:I4');
  for (const line of introLines) {
    addMergedBodyRow(sheet, line, 'A:I');
  }

  sheet.addRow([]);
  addMergedSectionHeader(sheet, sheet.rowCount + 1, 'How To Fill The Template', `A${sheet.rowCount + 1}:I${sheet.rowCount + 1}`);
  const instructionLines = [
    'Put the employee name in column A.',
    'Use one date column for every day the employee is abroad.',
    'Weekends are included and should be filled in when travel continues over a weekend.',
    'Enter only one 2-letter ISO country code per day, such as DE or FR.',
    'If someone travels from one EU country to another EU country, record the country they are in for that day.',
    'If someone travels between an EU country and a non-EU country on the same day, record the country they are physically in at the end of that day.',
    'Leave cells blank when there is no travel to record.',
    'Do not rename the date headers.',
  ];
  for (const line of instructionLines) {
    addMergedBodyRow(sheet, line, 'A:I');
  }

  sheet.addRow([]);
  addMergedSectionHeader(sheet, sheet.rowCount + 1, 'Accepted Cell Entries', `A${sheet.rowCount + 1}:I${sheet.rowCount + 1}`);
  const acceptedHeaderRow = sheet.addRow(['Code', 'Meaning']);
  styleReferenceTableHeader(acceptedHeaderRow, 2);
  sheet.mergeCells(`B${acceptedHeaderRow.number}:I${acceptedHeaderRow.number}`);
  const acceptedPatterns = [
    ['DE', 'In Germany that day'],
    ['FR', 'In France that day'],
    ['ES', 'In Spain that day'],
    ['GB', 'In the United Kingdom that day'],
    ['US', 'In the United States that day'],
  ];
  for (const row of acceptedPatterns) {
    const dataRow = sheet.addRow(row);
    sheet.mergeCells(`B${dataRow.number}:I${dataRow.number}`);
    styleReferenceDataRow(dataRow, 2);
  }

  sheet.addRow([]);
  addMergedSectionHeader(sheet, sheet.rowCount + 1, 'Important Notes', `A${sheet.rowCount + 1}:I${sheet.rowCount + 1}`);
  addMergedBodyRow(sheet, 'Leave the cell blank if there is no travel to record for that day.', 'A:I');
  addMergedBodyRow(sheet, 'Non-Schengen destinations do not count toward the Schengen 90/180 total.', 'A:I');
  addMergedBodyRow(sheet, 'Use only one country code per day in the Template sheet.', 'A:I');

  sheet.addRow([]);
  addMergedSectionHeader(sheet, sheet.rowCount + 1, 'Worked Example', `A${sheet.rowCount + 1}:I${sheet.rowCount + 1}`);
  const exampleDates = [
    'Fri 07 Mar 2025',
    'Sat 08 Mar 2025',
    'Sun 09 Mar 2025',
    'Mon 10 Mar 2025',
    'Tue 11 Mar 2025',
    'Wed 12 Mar 2025',
    'Thu 13 Mar 2025',
  ];
  const exampleHeaderRow = sheet.addRow(['Employee', ...exampleDates]);
  styleReferenceTableHeader(exampleHeaderRow, 8);
  exampleHeaderRow.height = REFERENCE_EXAMPLE_HEADER_ROW_HEIGHT;

  const exampleRows = [
    ['Alex Turner', 'DE', 'DE', 'DE', 'DE', 'DE', '', ''],
    ['Sam Green', 'FR', 'FR', 'FR', 'NL', 'NL', 'NL', 'NL'],
    ['Priya Shah', '', '', 'GB', 'GB', '', 'US', 'US'],
    ['Morgan Lee', '', '', '', 'ES', 'ES', 'ES', 'ES'],
  ];

  for (const row of exampleRows) {
    const dataRow = sheet.addRow(row);
    styleReferenceDataRow(dataRow, 8);
  }
}

function addWorkbookBranding(workbook: Workbook) {
  const imageId = workbook.addImage({
    base64: COMPLYEUR_HORIZONTAL_LOGO_BASE64,
    extension: 'png',
  });

  const isoSheet = workbook.getWorksheet('ISO Country Codes');
  const instructionsSheet = workbook.getWorksheet('Example & Instructions');

  if (isoSheet) {
    isoSheet.addImage(imageId, {
      tl: { col: 5.5, row: 0.1 },
      ext: { width: 210, height: 44 },
      editAs: 'oneCell',
    });
  }

  if (instructionsSheet) {
    instructionsSheet.addImage(imageId, {
      tl: { col: 5.5, row: 0.08 },
      ext: { width: 210, height: 44 },
      editAs: 'oneCell',
    });
  }
}

function formatTemplateHeaderDate(date: Date): string {
  return format(date, 'EEE dd MMM yyyy');
}

function applySheetBaseStyle(sheet: Worksheet) {
  sheet.eachRow({ includeEmpty: true }, (row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = {
        ...cell.font,
        size: WORKBOOK_FONT_SIZE,
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
        ...cell.alignment,
      };
    });
  });
}

function applyTemplateBorders(sheet: Worksheet, columnCount: number, visibleRowCount: number) {
  for (let rowNumber = 1; rowNumber <= visibleRowCount; rowNumber += 1) {
    for (let columnNumber = 1; columnNumber <= columnCount; columnNumber += 1) {
      sheet.getRow(rowNumber).getCell(columnNumber).border = TEMPLATE_GRID_BORDER;
    }
  }
}

function createReferenceHeader(sheet: Worksheet, title: string, titleRange: string) {
  sheet.mergeCells(titleRange);
  const titleCell = sheet.getCell(titleRange.split(':')[0]);
  titleCell.value = title;
  titleCell.font = { bold: true, size: WORKBOOK_FONT_SIZE, color: { argb: 'FF0F172A' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: REFERENCE_SHEET_TITLE_FILL },
  };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  titleCell.border = REFERENCE_SHEET_BORDER;
  sheet.getRow(Number(titleCell.row)).height = REFERENCE_TITLE_ROW_HEIGHT;
}

function createReferenceSubtitle(sheet: Worksheet, text: string, range: string) {
  sheet.mergeCells(range);
  const cell = sheet.getCell(range.split(':')[0]);
  cell.value = text;
  cell.font = { size: WORKBOOK_FONT_SIZE, color: { argb: 'FF334155' } };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: REFERENCE_SHEET_PANEL_FILL },
  };
  cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  cell.border = REFERENCE_SHEET_BORDER;
  sheet.getRow(Number(cell.row)).height = REFERENCE_SUBTITLE_ROW_HEIGHT;
}

function addMergedSectionHeader(sheet: Worksheet, rowNumber: number, text: string, range: string) {
  sheet.mergeCells(range);
  const cell = sheet.getCell(`A${rowNumber}`);
  cell.value = text;
  cell.font = { bold: true, size: WORKBOOK_FONT_SIZE };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: REFERENCE_SHEET_SECTION_FILL },
  };
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
  cell.border = REFERENCE_SHEET_BORDER;
  sheet.getRow(rowNumber).height = 26;
}

function addMergedBodyRow(sheet: Worksheet, text: string, range: string) {
  const row = sheet.addRow([text]);
  const [startColumn, endColumn] = range.split(':');
  const rowRange = `${startColumn}${row.number}:${endColumn}${row.number}`;
  sheet.mergeCells(rowRange);
  const cell = sheet.getCell(`A${row.number}`);
  cell.font = { size: WORKBOOK_FONT_SIZE, color: { argb: 'FF0F172A' } };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: REFERENCE_SHEET_PANEL_FILL },
  };
  cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
  cell.border = REFERENCE_SHEET_BORDER;
  row.height = 24;
}

function styleReferenceTableHeader(row: Row, columnCount: number) {
  for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) {
    const cell = row.getCell(columnIndex);
    cell.font = { bold: true, size: WORKBOOK_FONT_SIZE };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: REFERENCE_SHEET_TABLE_HEADER_FILL },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = REFERENCE_SHEET_BORDER;
  }
  row.height = 26;
}

function styleReferenceDataRow(row: Row, columnCount: number) {
  for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) {
    const cell = row.getCell(columnIndex);
    cell.font = { size: WORKBOOK_FONT_SIZE };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFFFF' },
    };
    cell.alignment = {
      horizontal: columnIndex === 2 ? 'center' : 'left',
      vertical: 'middle',
      wrapText: true,
    };
    cell.border = REFERENCE_SHEET_BORDER;
  }
  row.height = 24;
}

type IsoRegionRow = {
  code: string;
  groupLabel: string;
};

function buildIsoRegions(): Array<[string, IsoRegionRow[]]> {
  const regionBuckets = new Map<string, IsoRegionRow[]>();

  for (const country of COUNTRY_LIST) {
    const region = getIsoReferenceRegion(country.code);
    const groupLabel = isSchengenCountry(country.code)
      ? 'Schengen'
      : isNonSchengenEU(country.code)
        ? 'EU (non-Schengen)'
        : 'Other';

    if (!regionBuckets.has(region)) {
      regionBuckets.set(region, []);
    }

    regionBuckets.get(region)?.push({
      code: country.code,
      groupLabel,
    });
  }

  return Array.from(regionBuckets.entries());
}

function getIsoReferenceRegion(code: string): string {
  const europe = new Set([
    'AD', 'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR',
    'HR', 'HU', 'IE', 'IS', 'IT', 'LI', 'LT', 'LU', 'LV', 'MC', 'MT', 'NL', 'NO', 'PL', 'PT',
    'RO', 'RU', 'SE', 'SI', 'SK', 'SM', 'TR', 'UA', 'VA',
  ]);
  const americas = new Set(['BR', 'CA', 'MX', 'US']);
  const asiaPacific = new Set(['AU', 'CN', 'HK', 'IN', 'JP', 'KR', 'NZ', 'SG', 'TH', 'TW']);
  const middleEastAfrica = new Set(['AE', 'ZA']);

  if (europe.has(code)) return 'Europe';
  if (americas.has(code)) return 'Americas';
  if (asiaPacific.has(code)) return 'Asia-Pacific';
  if (middleEastAfrica.has(code)) return 'Middle East & Africa';
  return 'Other';
}

function toUint8Array(buffer: unknown): Uint8Array {
  if (buffer instanceof Uint8Array) {
    return buffer;
  }

  if (buffer instanceof ArrayBuffer) {
    return new Uint8Array(buffer);
  }

  if (
    typeof buffer === 'object' &&
    buffer !== null &&
    'buffer' in buffer &&
    buffer.buffer instanceof ArrayBuffer
  ) {
    const typedArray = buffer as Uint8Array;
    return new Uint8Array(
      typedArray.buffer,
      typedArray.byteOffset,
      typedArray.byteLength
    );
  }

  throw new Error('Unexpected workbook buffer type');
}
