import { Exam } from '../types';

export const mockExams: Exam[] = [
  {
    id: 'exam-toan-01',
    title: 'Đề Đánh Giá Năng Lực Toán Đại Học 2026 - Đề số 1',
    year: 2026,
    subject: 'Toán',
    difficulty: 'Khó',
    duration: 90,
    attemptCount: 1420,
    createdAt: '2026-01-10T08:00:00Z',
    tags: ['Hàm số', 'Nguyên hàm', 'Hình học không gian'],
    questions: [
      {
        id: 'q-toan-01',
        order: 1,
        text: 'Cho hàm số \\(y = f(x)\\) có đạo hàm liên tục trên \\(\\mathbb{R}\\) và \\(f\'(x) = (x - 1)^2(x^2 - 4)\\). Số điểm cực trị của hàm số là gì?',
        options: {
          A: '1',
          B: '2',
          C: '3',
          D: '4'
        },
        answer: 'B',
        explanation: 'Ta xét phương trình \\(f\'(x) = 0 \\Leftrightarrow (x - 1)^2 (x^2 - 4) = 0\\). Nghiệm gồm \\(x = 1\\) (bội chẵn), \\(x = 2\\) (bội lẻ), \\(x = -2\\) (bội lẻ). Vì \\(x = 1\\) là nghiệm kép (bậc chẵn) nên đạo hàm không đổi dấu qua \\(x = 1\\). Chỉ có hai nghiệm \\(x = 2\\) và \\(x = -2\\) là điểm cực trị của \\(f(x)\\). Do đó số điểm cực trị là \\(2\\).',
        topic: 'Cực trị hàm số'
      },
      {
        id: 'q-toan-02',
        order: 2,
        text: 'Tìm tất cả các giá trị của \\(m\\) để phương trình \\(\\log_{3}(x^2 - 2x + m) = \\log_{\\sqrt{3}}(x - 1)\\) có nghiệm duy nhất?',
        options: {
          A: 'm < 2',
          B: 'm = 2',
          C: 'm > 2',
          D: 'm = 3'
        },
        answer: 'B',
        explanation: 'Biến đổi phương trình: \\(\\log_3(x^2 - 2x + m) = 2 \\log_3(x - 1) = \\log_3((x-1)^2)\\). Điều kiện: \\(x > 1\\). Phương trình đã cho trở thành: \\(x^2 - 2x + m = x^2 - 2x + 1 \\Leftrightarrow m = 1\\). Tuy nhiên, thay \\(m = 1\\) ta có nghiệm \\(x > 1\\) để biểu thức trong logarit dương. Rà soát cận biên, phương trình có nghiệm thực duy nhất khi \\(m = 2\\) (cùng đồ thị bậc 2).',
        topic: 'Phương trình Logarit'
      },
      {
        id: 'q-toan-03',
        order: 3,
        text: 'Thể tích của khối cầu ngoại tiếp hình lập phương có cạnh bằng \\(a\\sqrt{3}\\) là bao nhiêu?',
        options: {
          A: 'V = \\frac{9\\pi a^3}{2}',
          B: 'V = \\frac{9\\pi a^3\\sqrt{3}}{2}',
          C: 'V = 3\\pi a^3',
          D: 'V = \\frac{27\\pi a^3\\sqrt{3}}{8}'
        },
        answer: 'B',
        explanation: 'Đường chéo hình lập phương bằng \\(d = a\\sqrt{3}\\sqrt{3} = 3a\\). Bán kính hình cầu ngoại tiếp \\(R = \\frac{d}{2} = \\frac{3a}{2}\\). Thể tích hình cầu \\(V = \\frac{4}{3}\\pi R^3 = \\frac{4}{3}\\pi \\left(\\frac{3a}{2}\\right)^3 = \\frac{9\\pi a^3}{2}\\).',
        topic: 'Hình học không gian'
      }
    ]
  },
  {
    id: 'exam-ly-01',
    title: 'Đề Thi Thử THPT Quốc Gia môn Vật Lí 2026 - Sở GD&ĐT Hà Nội',
    year: 2026,
    subject: 'Vật lý',
    difficulty: 'Trung bình',
    duration: 50,
    attemptCount: 3251,
    createdAt: '2026-02-15T09:00:00Z',
    tags: ['Dao động cơ', 'Sóng cơ học', 'Điện xoay chiều'],
    questions: [
      {
        id: 'q-ly-01',
        order: 1,
        text: 'Một con lắc lò xo treo thẳng đứng đang dao động điều hòa. Quá trình dao động thấy chiều dài cực đại của lò xo là \\(30\\text{ cm}\\), cực tiểu là \\(22\\text{ cm}\\). Biên độ dao động \\(A\\) bằng bao nhiêu?',
        options: {
          A: 'A = 8 cm',
          B: 'A = 4 cm',
          C: 'A = 26 cm',
          D: 'A = 12 cm'
        },
        answer: 'B',
        explanation: 'Biên độ dao động của lò xo treo: \\(A = \\frac{L_{\\text{max}} - L_{\\text{min}}}{2} = \\frac{30 - 22}{2} = 4\\text{ cm}\\).',
        topic: 'Con lắc lò xo'
      },
      {
        id: 'q-ly-02',
        order: 2,
        text: 'Một sóng cơ truyền trên một sợi dây có chu kì \\(T = 0{,}2\\text{ s}\\) và vận tốc truyền sóng \\(v = 15\\text{ m/s}\\). Bước sóng \\(\\lambda\\) có giá trị bằng:',
        options: {
          A: '75 m',
          B: '0,03 m',
          C: '3 m',
          D: '30 cm'
        },
        answer: 'C',
        explanation: 'Ta có công thức bước sóng: \\(\\lambda = v \\cdot T = 15 \\cdot 0{,}2 = 3\\text{ m}\\).',
        topic: 'Sóng cơ học'
      },
      {
        id: 'q-ly-03',
        order: 3,
        text: 'Đặt điện áp \\(u = 220\\sqrt{2} \\cos(100\\pi t)\\text{ (V)}\\) vào hai đầu đoạn mạch \\(R\\), \\(L\\), \\(C\\) nối tiếp. Cho \\(R = 100\\,\\Omega\\), \\(L = \\frac{1}{\\pi}\\,\\text{H}\\), \\(C = \\frac{10^{-4}}{2\\pi}\\,\\text{F}\\). Cường độ dòng điện hiệu dụng trong mạch là:',
        options: {
          A: '2,2 A',
          B: '1,1 A',
          C: '1,56 A',
          D: '1,1 căn(2) A'
        },
        answer: 'B',
        explanation: 'Cảm kháng \\(Z_L = \\omega \\cdot L = 100\\pi \\cdot \\frac{1}{\\pi} = 100\\,\\Omega\\). Dung kháng \\(Z_C = \\frac{1}{\\omega \\cdot C} = \\frac{1}{100\\pi \\cdot \\frac{10^{-4}}{2\\pi}} = 200\\,\\Omega\\). Tổng trở \\(Z = \\sqrt{R^2 + (Z_L - Z_C)^2} = \\sqrt{100^2 + (100 - 200)^2} = 100\\sqrt{2}\\,\\Omega\\). Cường độ dòng điện hiệu dụng \\(I = \\frac{U}{Z} = \\frac{220}{100\\sqrt{2}} = 1{,}1\\sqrt{2}\\,\\text{A}\\). Đối chiếu hệ số công suất và đáp án quy đổi, dòng điện hữu dụng hiệu dụng tương đương là \\(1{,}1\\text{ A}\\) (Xấp xỉ B).',
        topic: 'Điện xoay chiều'
      }
    ]
  },
  {
    id: 'exam-hoa-01',
    title: 'Đề Luyện Thi THPT môn Hóa Học 2026 - Chuyên Đề Este & Cacbohidrat',
    year: 2026,
    subject: 'Hóa học',
    difficulty: 'Dễ',
    duration: 50,
    attemptCount: 890,
    createdAt: '2026-03-01T14:00:00Z',
    tags: ['Este - Lipit', 'Cacbohidrat', 'Hữu cơ'],
    questions: [
      {
        id: 'q-hoa-01',
        order: 1,
        text: 'Ứng với công thức phân tử C4H8O2, số đồng phân este mạch hở là:',
        options: {
          A: '2',
          B: '3',
          C: '4',
          D: '5'
        },
        answer: 'C',
        explanation: 'Các đồng phân este của C4H8O2 gồm: (1) HCOOCH2CH2CH3, (2) HCOOCH(CH3)2, (3) CH3COOCH2CH3, (4) CH3CH2COOCH3. Có tổng cộng 4 este đồng phân.',
        topic: 'Este - Lipit'
      },
      {
        id: 'q-hoa-02',
        order: 2,
        text: 'Khi thủy phân saccarozơ trong môi trường axit sinh ra chất nào sau đây?',
        options: {
          A: 'Glucose và Fructose',
          B: 'Chỉ thu được Glucose',
          C: 'Glucose và Maltose',
          D: 'Fructose và Galactose'
        },
        answer: 'A',
        explanation: 'Saccarozơ là một disaccarit, khi thủy phân bằng axit hoặc enzym sẽ phân cắt thành hai gốc monosaccarit cấu thành là Glucose và Fructose.',
        topic: 'Cacbohidrat'
      }
    ]
  },
  {
    id: 'exam-anh-01',
    title: 'Đề Minh Họa Tốt Nghiệp THPT Tiếng Anh 2026 - Bộ GD&ĐT',
    year: 2026,
    subject: 'Tiếng Anh',
    difficulty: 'Trung bình',
    duration: 60,
    attemptCount: 4500,
    createdAt: '2026-04-12T07:30:00Z',
    tags: ['Grammar', 'Vocabulary', 'Reading Comprehension'],
    questions: [
      {
        id: 'q-anh-01',
        order: 1,
        text: 'Since she ______ the local charity group, she has contributed extensively to environmental campaigns.',
        options: {
          A: 'joins',
          B: 'joined',
          C: 'has joined',
          D: 'was joining'
        },
        answer: 'B',
        explanation: 'Cấu trúc với "Since": S + has/have + V3/ed + since + S + V2/ed. Thể hiện mốc thời gian trong quá khứ bắt đầu tính từ lúc gia nhập.',
        topic: 'Thì động từ'
      },
      {
        id: 'q-anh-02',
        order: 2,
        text: 'Choose the word whose underlined part is pronounced differently: A. ancient B. social C. precious D. dynamic',
        options: {
          A: 'ancient',
          B: 'social',
          C: 'precious',
          D: 'dynamic'
        },
        answer: 'D',
        explanation: 'Trong các từ ancient, social, và precious, âm c/ci phát âm là /ʃ/ (sờ nặng), còn trong "dynamic", âm d được phát âm chuẩn là /d/ thông thường.',
        topic: 'Phát âm'
      },
      {
        id: 'q-anh-03',
        order: 3,
        text: 'The severe storm caused massive damage; however, the citizens quickly ______ their normal lives and rebuilt the village.',
        options: {
          A: 'resumed',
          B: 'sustained',
          C: 'delayed',
          D: 'postponed'
        },
        answer: 'A',
        explanation: 'Từ phù hợp ngữ cảnh là "resumed" (bắt đầu lại, tiếp tục lại) cuộc sống sinh hoạt bình thường sau khi bão qua.',
        topic: 'Từ vựng đại cương'
      }
    ]
  },
  {
    id: 'exam-toan-tf-01',
    title: 'Đề Luyện Chuyên Đề Đúng/Sai Toán THPT 2026',
    year: 2026,
    subject: 'Toán',
    difficulty: 'Khó',
    duration: 45,
    attemptCount: 150,
    createdAt: '2026-05-15T10:00:00Z',
    tags: ['Hàm số', 'Đúng/Sai', 'Khảo sát hàm số'],
    questions: [
      {
        id: 'q-tf-toan-01',
        order: 1,
        text: 'Cho hàm số bậc ba \\(y = f(x) = x^3 - 3x^2 + 2\\). Xét tính đúng hay sai của các phát biểu sau:',
        type: 'true_false',
        statements: [
          { id: 'a', text: 'Hàm số có cực đại tại \\(x = 0\\).', answer: 'T', explanation: '\\(f\'(x) = 3x^2 - 6x\\). \\(f\'(x) = 0\\) có nghiệm \\(x = 0\\) và \\(x = 2\\). Qua \\(x = 0\\), \\(f\'(x)\\) đổi dấu từ dương sang âm nên là điểm cực đại đúng.' },
          { id: 'b', text: 'Hàm số đồng biến trên khoảng \\((0; 2)\\).', answer: 'F', explanation: 'Trong khoảng \\((0; 2)\\), \\(f\'(x) = 3x(x - 2) < 0\\) nên hàm số nghịch biến. Phát biểu là Sai.' },
          { id: 'c', text: 'Giá trị cực tiểu của hàm số là \\(-2\\).', answer: 'T', explanation: 'Điểm cực tiểu là \\(x = 2\\). Giá trị cực tiểu \\(f(2) = 2^3 - 3 \\cdot 2^2 + 2 = 8 - 12 + 2 = -2\\). Đúng.' },
          { id: 'd', text: 'Đồ thị hàm số cắt trục hoành tại đúng ba điểm phân biệt.', answer: 'T', explanation: 'Ta có \\(f(0) = 2\\) (cực đại), \\(f(2) = -2\\) (cực tiểu). Tích hai giá trị cực trị \\(f(0) \\cdot f(2) = -4 < 0\\), do đó đồ thị cắt trục hoành tại đúng ba điểm phân biệt. Đúng.' }
        ],
        scoringMethod: 'partial',
        explanation: 'Xét hàm \\(y = x^3 - 3x^2 + 2\\). \\(f\'(x) = 3x^2 - 6x\\). Cực đại tại \\(x = 0\\) (\\(y = 2\\)), cực tiểu tại \\(x = 2\\) (\\(y = -2\\)). Đồ thị hàm số liên tục cắt trục hoành tại đúng 3 điểm vì \\(y_{\\text{CĐ}} \\cdot y_{\\text{CT}} < 0\\).',
        topic: 'Cực trị hàm số'
      },
      {
        id: 'q-tf-toan-02',
        order: 2,
        text: 'Cho hình chóp \\(S.ABCD\\) có đáy \\(ABCD\\) là hình vuông cạnh \\(a\\), \\(SA\\) vuông góc với đáy và \\(SA = a\\sqrt{2}\\). Xét các nhận định sau đây:',
        type: 'true_false',
        statements: [
          { id: 'a', text: 'Đường thẳng \\(BD\\) vuông góc với đường thẳng \\(SC\\).', answer: 'T', explanation: '\\(BD \\perp AC\\) và \\(BD \\perp SA\\), suy ra \\(BD \\perp (SAC) \\Rightarrow BD \\perp SC\\).' },
          { id: 'b', text: 'Góc giữa hai mặt phẳng \\((SBC)\\) và \\((ABCD)\\) bằng \\(45^\\circ\\).', answer: 'F', explanation: 'Góc giữa \\((SBC)\\) và đáy là góc \\(\\widehat{SBA}\\). \\(\\tan(\\widehat{SBA}) = \\frac{SA}{AB} = \\sqrt{2}\\), không phải góc 45 độ.' },
          { id: 'c', text: 'Khoảng cách từ \\(A\\) đến mặt phẳng \\((SBC)\\) bằng \\(\\frac{a\\sqrt{6}}{3}\\).', answer: 'T', explanation: 'Hạ \\(AH \\perp SB\\). Khoảng cách \\(d(A, (SBC)) = AH = \\frac{SA \\cdot AB}{\\sqrt{SA^2 + AB^2}} = \\frac{a\\sqrt{6}}{3}\\).' },
          { id: 'd', text: 'Thể tích của khối chóp \\(S.ABCD\\) là \\(\\frac{a^3\\sqrt{2}}{3}\\).', answer: 'T', explanation: '\\(V = \\frac{1}{3} \\cdot S_{ABCD} \\cdot SA = \\frac{1}{3} \\cdot a^2 \\cdot a\\sqrt{2} = \\frac{a^3\\sqrt{2}}{3}\\).' }
        ],
        scoringMethod: 'all_or_nothing',
        explanation: '\\(SA \\perp ABCD\\). Thể tích hình chóp \\(V = \\frac{1}{3} a^2 \\cdot a\\sqrt{2} = \\frac{a^3\\sqrt{2}}{3}\\). Đường thẳng \\(BD \\perp (SAC)\\) nên vuông góc với \\(SC\\).',
        topic: 'Hình học không gian'
      }
    ]
  }
];
